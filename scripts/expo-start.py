#!/usr/bin/env python3
"""
Wraps `expo start` with a real PTY so Metro runs in interactive mode,
then automatically selects "Proceed anonymously" every time the
unverified-app prompt appears — handles Metro restarts too.
"""
import os, pty, re, select, sys, time

args = sys.argv[1:]  # e.g. --localhost --port 18115

master_fd, slave_fd = pty.openpty()

pid = os.fork()
if pid == 0:
    # ── child: become expo start ──────────────────────────────────────────
    os.close(master_fd)
    os.setsid()
    import fcntl, termios
    fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
    for fd in (0, 1, 2):
        os.dup2(slave_fd, fd)
    os.close(slave_fd)
    env = {**os.environ, "EXPO_NO_TELEMETRY": "1", "FORCE_COLOR": "1"}
    os.execvpe("pnpm", ["pnpm", "exec", "expo", "start"] + args, env)
else:
    # ── parent: relay output, answer the prompt every time it appears ─────
    os.close(slave_fd)
    buf = b""
    last_answered = 0.0   # timestamp of last answer to debounce rapid re-triggers

    while True:
        try:
            r, _, _ = select.select([master_fd], [], [], 0.5)
            if not r:
                continue
            chunk = os.read(master_fd, 4096)
            if not chunk:
                break
            sys.stdout.buffer.write(chunk)
            sys.stdout.buffer.flush()
            buf += chunk
            # Strip ANSI escape codes for plain-text matching
            plain = re.sub(rb"\x1b\[[0-9;]*[A-Za-z]", b"", buf)
            now = time.time()
            if b"Proceed anonymously" in plain and (now - last_answered) > 3.0:
                last_answered = now
                time.sleep(0.15)
                os.write(master_fd, b"\x1b[B")   # ↓ arrow  → highlight "Proceed anonymously"
                time.sleep(0.05)
                os.write(master_fd, b"\r")        # enter   → confirm
                buf = b""
        except OSError:
            break

    _, status = os.waitpid(pid, 0)
    sys.exit(os.waitstatus_to_exitcode(status))
