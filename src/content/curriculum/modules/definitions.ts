import { moduleDefinitionsSchema, type ModuleDefinition } from "@/content/module-definitions";

const definitions = [
  {
    "id": 1,
    "title": "How computers and operating systems work",
    "phase": "Foundations",
    "level": "Core",
    "prerequisites": "None; curiosity and a PC are enough.",
    "intro": "Build a mental model of what happens between starting a program and a service handling a request. You will use it to investigate Linux processes, storage, and common failures throughout the rest of this curriculum.",
    "overview": "",
    "learningQuestion": "What changes inside a computer when you start an application, and how does it safely use memory, files, and devices?",
    "concepts": [
      {
        "label": "Program and process",
        "href": "#lesson-m01-l01"
      },
      {
        "label": "Processes and threads",
        "href": "#lesson-m01-l02"
      },
      {
        "label": "User space and the kernel",
        "href": "#lesson-m01-l03"
      },
      {
        "label": "Memory and persistence",
        "href": "#lesson-m01-l04"
      },
      {
        "label": "Boot and filesystems",
        "href": "#lesson-m01-l05"
      },
      {
        "label": "Virtual machines and containers",
        "href": "#lesson-m01-l06"
      }
    ],
    "lessons": [
      {
        "id": "M01-L01",
        "title": "From program to process"
      },
      {
        "id": "M01-L02",
        "title": "Processes and threads"
      },
      {
        "id": "M01-L03",
        "title": "User space and the kernel"
      },
      {
        "id": "M01-L04",
        "title": "Memory, storage, and failures"
      },
      {
        "id": "M01-L05",
        "title": "Boot and filesystems"
      },
      {
        "id": "M01-L06",
        "title": "Virtual machines and containers"
      }
    ],
    "moduleReview": {
      "id": "M01-R01",
      "title": "Trace one simple failure"
    },
    "practice": "Use Activity A01 to trace one running process through inspect, explain, and verify. Treat command output as evidence: explain what each observation confirms and what it cannot tell you by itself.",
    "typicalMistakes": "CPU usage and memory usage are different measurements. A VM and a container have different kernel boundaries. A process that is not using CPU may be blocked while waiting; that alone does not prove a network failure.",
    "miniLab": "Use a disposable Ubuntu VM with a restorable snapshot. Capture its virtual CPU, memory, disk, and network settings. Inspect one process owned by your user; record its PID, PPID, command, RSS, thread count, and an open-file-descriptor observation only if permitted. Explain the meaning and limits of each observation. Do not use `sudo`, change system settings, install tools, or inspect another user's process; save only sanitized evidence.",
    "readiness": "Without reopening the lesson, explain how a program becomes a process, how threads relate to a process, why a waiting process may use little CPU, how a file request crosses into the kernel, what RSS and VSZ represent, what normally survives a reboot, and how a VM differs from a Linux container.",
    "recallQuestion": "An application is running but waiting for a file read. What does the kernel do, why might the process use little CPU, and what would you inspect if the read fails?",
    "recallAnswer": "The application requests the read through a system call, commonly through a library. The kernel checks the request and coordinates access through the filesystem and relevant device or cache. While waiting for data, the thread can be blocked and another runnable thread can use the CPU. The process still exists, but is not executing during that wait. If the request fails, inspect the exact error, process identity, path, permissions, and mount state before changing the system.",
    "references": "- [Linux man-pages: execve(2)](https://man7.org/linux/man-pages/man2/execve.2.html)\n- [Linux man-pages: fork(2)](https://man7.org/linux/man-pages/man2/fork.2.html)\n- [Linux man-pages: pthreads(7)](https://man7.org/linux/man-pages/man7/pthreads.7.html)\n- [Linux man-pages: proc_pid_stat(5)](https://man7.org/linux/man-pages/man5/proc_pid_stat.5.html)\n- [procps-ng: ps(1)](https://man7.org/linux/man-pages/man1/ps.1.html)\n- [systemd: system bootup](https://www.freedesktop.org/software/systemd/man/latest/bootup.html)\n- [Linux kernel documentation: Virtual File System](https://docs.kernel.org/filesystems/vfs.html)\n- [Docker documentation: What is a container?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/)\n- [OpenStax: Processes and concurrency](https://openstax.org/books/introduction-computer-science/pages/6-3-processes-and-concurrency)\n- [Operating Systems: Three Easy Pieces](https://pages.cs.wisc.edu/~remzi/OSTEP/)",
    "related": "Activity A01; project specifications: Projects & Portfolio.",
    "sourcePdf": "01_DevOps_Foundations.pdf",
    "activityId": "A01"
  },
  {
    "id": 2,
    "title": "Linux command line and filesystems",
    "phase": "Foundations",
    "level": "Core",
    "prerequisites": "Module 01 or equivalent OS understanding.",
    "intro": "Use the terminal confidently enough to inspect a system without guessing what each command will\nchange.",
    "overview": "",
    "learningQuestion": "How can a short command pipeline find a useful clue in system files without changing the evidence you are inspecting?",
    "concepts": [
      {
        "label": "Paths, filesystems, and mounts",
        "href": "#lesson-m02-l01"
      },
      {
        "label": "Streams, pipes, and redirection",
        "href": "#lesson-m02-l02"
      },
      {
        "label": "Shell expansion and safe inspection",
        "href": "#lesson-m02-l03"
      },
      {
        "label": "Exit status and package managers",
        "href": "#lesson-m02-l04"
      }
    ],
    "lessons": [
      {
        "id": "M02-L01",
        "title": "Paths, filesystems, and mounts"
      },
      {
        "id": "M02-L02",
        "title": "Streams, pipes, and redirection"
      },
      {
        "id": "M02-L03",
        "title": "Shell expansion and safe inspection"
      },
      {
        "id": "M02-L04",
        "title": "Exit status and package managers"
      }
    ],
    "practice": "Create a disposable directory with sample logs and filenames containing spaces. Use `find`, `grep`, `sort`, `wc`,\n`head` and `less` to answer one question; redirect the report to a new file, then inspect it and the command's exit\nstatus. Compare expected and actual results before building the inventory in Activity A02.",
    "typicalMistakes": "Using sudo for everything, editing system files without backups, overlooking hidden files, or\naccidentally truncating a log with > instead of >>.",
    "miniLab": "Build a command-line directory inventory that records names, types, sizes and ownership into a\ntimestamped report.",
    "readiness": "From memory, find a file by name and content, explain which stream a pipe carries, and predict whether a redirection\nwill append or truncate before running it. Reproduce your directory inventory without a GUI.",
    "recallQuestion": "In `command > report.txt 2>&1`, which output streams go to `report.txt`, and what happens to an existing file with that name?",
    "recallAnswer": "The shell opens `report.txt` for standard output, truncating it if it already exists; `2>&1` then directs standard\nerror to the same destination as standard output. Redirection order matters because the second operation copies the\ncurrent destination of descriptor 1. Use a new path or append operator when preserving earlier output matters.",
    "references": "- [GNU Bash Reference Manual: redirections and pipelines](https://www.gnu.org/software/bash/manual/bash.html)\n- [GNU Findutils manual](https://www.gnu.org/software/findutils/manual/)\n- [GNU Coreutils manual](https://www.gnu.org/software/coreutils/manual/)\n- [Debian Reference: package management](https://www.debian.org/doc/manuals/debian-reference/ch02.en.html)",
    "related": "Activity A02; project specifications: Projects & Portfolio.",
    "sourcePdf": "01_DevOps_Foundations.pdf",
    "activityId": "A02"
  },
  {
    "id": 3,
    "title": "Linux users, processes and service management",
    "phase": "Foundations",
    "level": "Core",
    "prerequisites": "Module 02: safe command-line use.",
    "intro": "Move from using Linux to administering a service: identities, permissions, lifecycle, logging and\ntroubleshooting.",
    "overview": "",
    "learningQuestion": "When a web service is unavailable, how can you tell whether the problem is its identity, process, service manager, log, or network listener?",
    "concepts": [
      {
        "label": "Identity and file permissions",
        "href": "#lesson-m03-l01"
      },
      {
        "label": "Process and service lifecycle",
        "href": "#lesson-m03-l02"
      },
      {
        "label": "Logs and fault isolation",
        "href": "#lesson-m03-l03"
      },
      {
        "label": "SSH and safe administration",
        "href": "#lesson-m03-l04"
      }
    ],
    "lessons": [
      {
        "id": "M03-L01",
        "title": "Identity and file permissions"
      },
      {
        "id": "M03-L02",
        "title": "Process and service lifecycle"
      },
      {
        "id": "M03-L03",
        "title": "Logs and fault isolation"
      },
      {
        "id": "M03-L04",
        "title": "SSH and safe administration"
      }
    ],
    "practice": "Create a non-root service account in a disposable VM, inspect file and directory permissions, and intentionally\nstart a test service with an invalid path. Compare unit status, journal output and listener state; correct one cause\nand verify the local endpoint before moving on to Activity A03.",
    "typicalMistakes": "Changing sshd settings before testing another active session, running network-facing software as\nroot, and assuming restart loops fix the underlying failure.",
    "miniLab": "Create a minimal systemd unit for a test web service with restart policy and a written rollback\nprocedure.",
    "readiness": "Explain a permission denial using the process identity and every directory in the path. Start and stop a test service,\nidentify one failure from its log and demonstrate an SSH connection using a key without weakening server policy.",
    "recallQuestion": "What is the difference between a systemd service being enabled, active, and healthy to a user?",
    "recallAnswer": "Enabled describes whether the service is configured to start automatically at boot. Active describes the unit's\ncurrent manager state. User-visible health depends on the application actually completing a meaningful request.\nCheck the unit, its logs and a functional endpoint; do not treat one state label as proof of all three.",
    "references": "- [systemd: systemctl](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html)\n- [systemd: journalctl](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html)\n- [Linux man-pages: chmod(1)](https://man7.org/linux/man-pages/man1/chmod.1.html)\n- [OpenSSH manual pages](https://www.openssh.com/manual.html)",
    "related": "Activity A03; project specifications: Projects & Portfolio.",
    "sourcePdf": "01_DevOps_Foundations.pdf",
    "activityId": "A03"
  },
  {
    "id": 4,
    "title": "Networking: from a packet to a web request",
    "phase": "Foundations",
    "level": "Core",
    "prerequisites": "Basic Linux CLI (Modules 01-03).",
    "intro": "Understand how a request gets from one host to another; this is the foundation for debugging\ncloud networks and container networking.",
    "overview": "",
    "learningQuestion": "If a hostname resolves but a browser cannot open the service, which part of the path should you test next and what evidence would distinguish the causes?",
    "concepts": [
      {
        "label": "Addresses, subnets, and routes",
        "href": "#lesson-m04-l01"
      },
      {
        "label": "DNS and transport protocols",
        "href": "#lesson-m04-l02"
      },
      {
        "label": "Ports, filtering, and application checks",
        "href": "#lesson-m04-l03"
      }
    ],
    "lessons": [
      {
        "id": "M04-L01",
        "title": "Addresses, subnets, and routes"
      },
      {
        "id": "M04-L02",
        "title": "DNS and transport protocols"
      },
      {
        "id": "M04-L03",
        "title": "Ports, filtering, and application checks"
      }
    ],
    "practice": "Use `dig`, `ip route get`, `ss -ltn`, `curl` and (where appropriate) `ping` against a service you own. For each test,\nwrite down what it proves and what it cannot prove. Change one safe lab rule, confirm the expected failure, restore\nthe rule, then verify the application request succeeds.",
    "typicalMistakes": "Assuming a private IP is reachable from the internet, treating DNS errors as firewall errors, and\nopening broad inbound ports to “make it work.”",
    "miniLab": "Map your own lab network and write a connectivity troubleshooting worksheet with at least four\ndistinct failure categories.",
    "readiness": "Given a resolved hostname and failed HTTPS request, identify the next check using the error observed (route,\ntimeout, connection refusal, TLS or HTTP response). Explain what a ping result can and cannot establish.",
    "recallQuestion": "DNS returns an IP address successfully, but `curl https://host/health` times out. Has a TCP connection or healthy application been proven?",
    "recallAnswer": "No. DNS only supplied an address. The client still needs a route, permitted traffic, a listener, successful TCP/TLS\nsetup and an application response. A timeout narrows the symptom but can originate at multiple network boundaries;\ncompare route and connection evidence rather than changing DNS first.",
    "references": "- [RFC 1918: private IPv4 address allocation](https://www.rfc-editor.org/rfc/rfc1918.html)\n- [RFC 1034: Domain names - concepts and facilities](https://www.rfc-editor.org/rfc/rfc1034.html)\n- [RFC 9293: Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293.html)\n- [iproute2 manual pages](https://man7.org/linux/man-pages/man8/ip.8.html)",
    "related": "Activity A04; project specifications: Projects & Portfolio.",
    "sourcePdf": "01_DevOps_Foundations.pdf",
    "activityId": "A04"
  },
  {
    "id": 5,
    "title": "HTTP, TLS, APIs and reverse proxies",
    "phase": "Foundations",
    "level": "Core",
    "prerequisites": "Module 04 networking.",
    "intro": "Learn the application request path behind many backend and infrastructure tasks, without needing\nto master frontend development.",
    "overview": "",
    "learningQuestion": "When the browser displays an error, how can you locate the exact boundary that failed between name lookup and the application response?",
    "concepts": [
      {
        "label": "HTTP requests and responses",
        "href": "#lesson-m05-l01"
      },
      {
        "label": "TLS and authenticated connections",
        "href": "#lesson-m05-l02"
      },
      {
        "label": "Reverse proxies and upstreams",
        "href": "#lesson-m05-l03"
      }
    ],
    "lessons": [
      {
        "id": "M05-L01",
        "title": "HTTP requests and responses"
      },
      {
        "id": "M05-L02",
        "title": "TLS and authenticated connections"
      },
      {
        "id": "M05-L03",
        "title": "Reverse proxies and upstreams"
      }
    ],
    "practice": "Use `curl -i` against a working local endpoint and a deliberately incorrect path. Then stop only the disposable\nupstream and request it through NGINX to observe the proxy error. Compare the API and proxy logs; restore the\nupstream and confirm the health endpoint before Activity A05.",
    "typicalMistakes": "Mistaking localhost inside a container for the host, passing untrusted forwarded headers blindly,\nand treating HTTPS as a substitute for authorization.",
    "miniLab": "Put a tiny /health FastAPI endpoint behind NGINX in a local VM; document exactly how\nrequests reach it.",
    "readiness": "Trace the request through name resolution, connection, TLS, proxy and API. Diagnose a broken upstream mapping\nusing response and log evidence, and explain why HTTPS alone does not establish authorization.",
    "recallQuestion": "Why does an HTTP 502 from a reverse proxy not prove the API itself generated that response?",
    "recallAnswer": "The proxy is an HTTP server and can construct a 502 when it cannot reach its configured upstream or receives an\ninvalid upstream response. Compare the proxy's error log, upstream address and direct API request to identify where\nthe failure occurs. A status code is evidence about the responding hop, not a complete path trace.",
    "references": "- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)\n- [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446.html)\n- [NGINX: reverse proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)",
    "related": "Activity A05; project specifications: Projects & Portfolio.",
    "sourcePdf": "01_DevOps_Foundations.pdf",
    "activityId": "A05"
  },
  {
    "id": 6,
    "title": "Bash and Python for operational automation",
    "phase": "Foundations",
    "level": "Core",
    "prerequisites": "Modules 02-05.",
    "intro": "Build small trustworthy tools before delegating important tasks to automation.",
    "overview": "Bash is good for composing system commands and short administrative workflows; Python is usually easier for\nstructured data, error handling and substantial reusable utilities. Choose the simpler tool for the actual task instead\nof using Python or Bash automatically.\nIn shell scripts, quoting and exit handling are safety features: an unquoted variable can split unexpectedly, and a\npipeline may hide the failure you care about. In Python, handle command failures explicitly, validate input, use\ntimeouts for network requests and do not silence exceptions merely to keep a script running.\nReproducibility matters. Manage Python dependencies in an isolated virtual environment, document requirements\nand write tests around parsing and decision logic. For a maintenance tool, a dry-run mode and clear failure reporting\ncan be more valuable than adding new features.",
    "learningQuestion": "How do you automate a repeated system check without turning an unexpected input or command failure into a destructive or misleading result?",
    "concepts": [
      {
        "label": "Bash for small system workflows",
        "href": "#lesson-m06-l01"
      },
      {
        "label": "Python for structured operations",
        "href": "#lesson-m06-l02"
      },
      {
        "label": "Testing and failure handling",
        "href": "#lesson-m06-l03"
      }
    ],
    "lessons": [
      {
        "id": "M06-L01",
        "title": "Bash for small system workflows"
      },
      {
        "id": "M06-L02",
        "title": "Python for structured operations"
      },
      {
        "id": "M06-L03",
        "title": "Testing and failure handling"
      }
    ],
    "practice": "Write one Bash disk-space report and one Python JSON log summarizer. Test a normal file, an empty file, malformed\nJSON and a missing path. Record which errors are reported, what exit status appears, and verify that the scripts do\nnot alter source files before starting Activity A06.",
    "typicalMistakes": "Running arbitrary shell input from external data, using broad recursive deletes, or assuming scripts\nsucceed without checking exit codes.",
    "miniLab": "Build a personal sysadmin CLI that reports disk usage, service status and connectivity, with --help\nand a safe read-only default.",
    "readiness": "Create and explain a small script you can maintain. Show one normal run and one controlled failure, including the\nmessage and exit status. Explain why each command or library call is safe for its input.",
    "recallQuestion": "What are the important differences between calling `subprocess.run([...])` with an argument list and constructing a shell command string?",
    "recallAnswer": "An argument list passes each value as a distinct argument without asking a shell to expand it, reducing quoting\nmistakes and command-injection risk. With `check=True`, a failing command raises an exception instead of silently\nlooking successful. A timeout bounds how long the parent waits. The caller still needs to handle errors and validate\noutputs according to the task.",
    "references": "- [GNU Bash Reference Manual](https://www.gnu.org/software/bash/manual/bash.html)\n- [Python tutorial](https://docs.python.org/3/tutorial/)\n- [Python subprocess documentation](https://docs.python.org/3/library/subprocess.html)\n- [Python virtual environments](https://docs.python.org/3/library/venv.html)",
    "related": "Activity A06; project specifications: Projects & Portfolio.",
    "sourcePdf": "01_DevOps_Foundations.pdf",
    "activityId": "A06"
  },
  {
    "id": 7,
    "title": "Git, collaboration and technical documentation",
    "phase": "Foundations",
    "level": "Core",
    "prerequisites": "Comfort with files and the shell.",
    "intro": "Turn experiments into a history you can reproduce and discuss with teammates or future\nemployers.",
    "overview": "Git tracks committed snapshots and their history; the working directory, staging area and local repository are\ndistinct. A remote is a copy of repository history, not a magical backup of every local file. Worktrees and stashes add\nadditional state that you must inspect before deleting or merging anything.\nGood commits isolate a coherent change; reviews should discuss behavior, tests and risk rather than only\nformatting. A branch is a pointer to a line of commits, not a separate folder by definition. Learn to inspect\ndifferences and history before resolving a conflict.\nDocumentation should help a person who was not present: state prerequisites, setup steps, configuration sources,\nexpected behavior and recovery steps. Keep secrets and machine-specific files out of version control. A short\nreliable runbook is more useful than a large README that nobody can execute.",
    "learningQuestion": "How can you prove exactly which change is being shared, what review evidence supports it, and how another person can reproduce the result?",
    "concepts": [
      {
        "label": "The working tree, index, and commits",
        "href": "#lesson-m07-l01"
      },
      {
        "label": "Branches, remotes, and review",
        "href": "#lesson-m07-l02"
      },
      {
        "label": "Reproducible documentation",
        "href": "#lesson-m07-l03"
      }
    ],
    "lessons": [
      {
        "id": "M07-L01",
        "title": "The working tree, index, and commits"
      },
      {
        "id": "M07-L02",
        "title": "Branches, remotes, and review"
      },
      {
        "id": "M07-L03",
        "title": "Reproducible documentation"
      }
    ],
    "practice": "Create a feature branch, make two small edits, stage only one, and compare `git diff` with `git diff --cached`.\nResolve a harmless text conflict in a disposable repository and explain the final result before creating a reviewable\ncommit for Activity A07.",
    "typicalMistakes": "Committing .env secrets, force-pushing shared history without coordination, or assuming a git\nstash has safely transferred into another branch.",
    "miniLab": "Publish a lab repository with a clear README, setup, limitations, security notes and changelog.",
    "readiness": "Explain the difference between working-tree, staged, committed and pushed changes. Recover from a harmless\nconflict and let another person reproduce the lab from a clean checkout using only the README.",
    "recallQuestion": "Does `git push` upload uncommitted edits or a stash, and which command helps inspect the next commit before creating it?",
    "recallAnswer": "No. Push transfers commits and their reachable history; uncommitted edits and local stashes remain in the local\nrepository. `git diff --cached` reviews the staged content that will enter the next commit. Use `git status` as well\nto find untracked files that are not included.",
    "references": "- [Git documentation: Git Basics](https://git-scm.com/book/en/v2/Getting-Started-Git-Basics)\n- [Git documentation: Branches](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell)\n- [GitHub Skills: Introduction to GitHub](https://github.com/skills/introduction-to-github)",
    "related": "Activity A07; project specifications: Projects & Portfolio.\nNext steps\nIf you can independently configure and troubleshoot a small Linux-hosted HTTP service, continue with containers in\n02_Infrastructure_and_Cloud.pdf. If any core concept is weak, revisit it before automating deployment.",
    "sourcePdf": "01_DevOps_Foundations.pdf",
    "activityId": "A07"
  },
  {
    "id": 8,
    "title": "Container fundamentals with Docker",
    "phase": "Infrastructure & Cloud",
    "level": "Core",
    "prerequisites": "Linux processes, networking and HTTP (01-05).",
    "intro": "Package applications reproducibly and understand what Docker isolates - and what it does not.",
    "overview": "An image is an immutable package definition; a container is a running instance with a writable layer. Files written\ninto that layer can disappear when the container is replaced, so persistent application state should use explicit\nvolumes or external services. An image tag is mutable; pinning a digest is more precise when reproducibility matters.\nDocker port publishing connects host-side traffic to a container port. Inside a container, localhost points at that\ncontainer, not the host or a neighbor. Container networking is not a replacement for learning ordinary TCP/IP,\nrouting and service binding.\nBuild lean images with pinned base versions where appropriate, non-root execution where feasible and a\n.dockerignore to avoid copying secrets and unnecessary files. A container is not automatically secure simply because\nit runs inside Docker.",
    "learningQuestion": "What does a container actually isolate, and where must you put data that needs to survive replacing it?",
    "concepts": [
      {
        "label": "Images and build context",
        "href": "#lesson-m08-l01"
      },
      {
        "label": "Containers and process lifecycle",
        "href": "#lesson-m08-l02"
      },
      {
        "label": "Persistence, networking, and exposure",
        "href": "#lesson-m08-l03"
      }
    ],
    "lessons": [
      {
        "id": "M08-L01",
        "title": "Images and build context"
      },
      {
        "id": "M08-L02",
        "title": "Containers and process lifecycle"
      },
      {
        "id": "M08-L03",
        "title": "Persistence, networking, and exposure"
      }
    ],
    "practice": "Build an image for your status API; inspect its logs, user, health, network, port mapping and mounts. Store one test\nvalue in the container layer and one in a mounted volume, then replace the container and compare which value\nremains. Never use production or personal data for this experiment.",
    "typicalMistakes": "Baking secrets into layers, treating EXPOSE as opening a firewall, running everything privileged,\nand confusing restart with rebuilding an image.",
    "miniLab": "Package the Status API in a Dockerfile and document its build/run and shutdown commands.",
    "readiness": "Explain the image/container distinction, identify the process running as PID 1, show the state location and diagnose\na service binding to the wrong interface or port. Demonstrate which traffic is host-published and which is internal.",
    "recallQuestion": "After a container is removed, why can a mounted-volume file remain while a file written only to the container layer disappears?",
    "recallAnswer": "The container layer belongs to that container's writable filesystem, so removing the instance removes that layer.\nA volume has a separate lifecycle and can survive replacement, but survival is not the same as a backup: verify that\nyou can restore a copy.",
    "references": "- [Docker: images and containers](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/)\n- [Docker: storage](https://docs.docker.com/engine/storage/)\n- [Docker build best practices](https://docs.docker.com/build/building/best-practices/)\n- [Docker Engine security](https://docs.docker.com/engine/security/)",
    "related": "Activity A08; project specifications: Projects & Portfolio.",
    "sourcePdf": "02_Infrastructure_and_Cloud.pdf",
    "activityId": "A08"
  },
  {
    "id": 9,
    "title": "Docker Compose and service dependencies",
    "phase": "Infrastructure & Cloud",
    "level": "Core",
    "prerequisites": "Module 08 plus basic web architecture.",
    "intro": "Operate multiple cooperating services on one host and understand dependency, startup and state\nboundaries.",
    "overview": "Compose describes a group of containers, their networking, volumes and operational settings. Containers on the\nsame Compose network can often reach one another by service name; published ports are typically required only to\nreach a service from outside the network.\nStartup order is not readiness. A database container process may exist before migrations or connections succeed;\nuse health checks and application retry logic instead of hoping a fixed sleep will work. Healthchecks should test\nmeaningful functionality, not merely whether a process is alive.\nPrefer configuration outside the image and protect credentials. Environment variables can still be exposed to\nprocesses and tooling, so they are not an adequate secret-management system on their own. Keep database data on\nnamed volumes and plan how schema changes and backups affect rollout and rollback.",
    "learningQuestion": "When the API starts before its database is ready, how should the application recover without relying on an arbitrary delay?",
    "concepts": [
      {
        "label": "Compose services and service discovery",
        "href": "#lesson-m09-l01"
      },
      {
        "label": "Readiness and health checks",
        "href": "#lesson-m09-l02"
      },
      {
        "label": "Configuration and persistent state",
        "href": "#lesson-m09-l03"
      }
    ],
    "lessons": [
      {
        "id": "M09-L01",
        "title": "Compose services and service discovery"
      },
      {
        "id": "M09-L02",
        "title": "Readiness and health checks"
      },
      {
        "id": "M09-L03",
        "title": "Configuration and persistent state"
      }
    ],
    "practice": "Build a Compose stack with API, reverse proxy and a local database. Start the API while the database is stopped,\nthen restore the database and observe the bounded retry behavior. Restart only the API, recreate the containers,\nand verify the same test record remains in the named volume.",
    "typicalMistakes": "Publishing database ports unnecessarily, writing passwords in example files, and mistaking\ndepends_on for guaranteed application readiness.",
    "miniLab": "Create one-command local startup for API + NGINX + PostgreSQL with a nonsecret\n.env.example.",
    "readiness": "From a clean clone, start the stack with the documented command, verify that the API reaches the database by\nservice name, and confirm that no unneeded database port is published. Recreate the containers and retrieve a test\nrecord from the volume; explain any health check that is failing.",
    "recallQuestion": "Does starting the database container before the API guarantee that the database is ready to accept application queries?",
    "recallAnswer": "No. Startup order only controls which container is started first. The process may still be initializing or may fail\nafterward. Use an application-relevant health check plus bounded connection retry and error handling so the stack can\nrecover from later dependency changes too.",
    "references": "- [Docker Compose services](https://docs.docker.com/compose/how-tos/networking/)\n- [Docker Compose startup order and health checks](https://docs.docker.com/compose/how-tos/startup-order/)\n- [Docker Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)",
    "related": "Activity A09; project specifications: Projects & Portfolio.",
    "sourcePdf": "02_Infrastructure_and_Cloud.pdf",
    "activityId": "A09"
  },
  {
    "id": 10,
    "title": "Continuous integration with GitHub Actions",
    "phase": "Infrastructure & Cloud",
    "level": "Core",
    "prerequisites": "Git, Python tests and Docker basics.",
    "intro": "Automate reproducible checks so a pull request provides stronger evidence than “it runs on my\nlaptop.”",
    "overview": "CI validates a change repeatedly in a controlled environment. The runner checks out a known commit, installs\ndependencies, executes tests and reports results; passing CI does not guarantee successful deployment or security.\nDistinguish unit tests, integration tests, lint checks and build checks because they cover different failure classes.\nEach job runs in a defined environment and may not share filesystem state with other jobs unless artifacts or explicit\nservices are used. Triggers such as pull_request and push have different trust boundaries. Workflows should not run\nuntrusted contributions with write access and long-lived secrets.\nStart with a small pipeline: dependency install, test, static checks, container build. Add reports and clear logs before\nadding advanced orchestration. When a job fails, first find the earliest causally relevant error rather than rerunning\nblindly.",
    "learningQuestion": "How can a pull request give trustworthy evidence about a specific change while limiting what untrusted code can access?",
    "concepts": [
      {
        "label": "Workflow events and jobs",
        "href": "#lesson-m10-l01"
      },
      {
        "label": "Checks and artifacts",
        "href": "#lesson-m10-l02"
      },
      {
        "label": "Permissions and trust boundaries",
        "href": "#lesson-m10-l03"
      }
    ],
    "lessons": [
      {
        "id": "M10-L01",
        "title": "Workflow events and jobs"
      },
      {
        "id": "M10-L02",
        "title": "Checks and artifacts"
      },
      {
        "id": "M10-L03",
        "title": "Permissions and trust boundaries"
      }
    ],
    "practice": "Break one test in a throwaway branch; inspect the earliest relevant failure and the commit SHA. Compare the event\nand token permissions for a branch push and a pull request. Restore the test, then explain which checks establish\ncorrectness evidence and which security boundaries Activity A10 still needs to enforce.",
    "typicalMistakes": "Granting broad repository write permissions to all jobs, copying secrets to logs, and confusing a\ngreen build with an operational health check.",
    "miniLab": "Implement PR checks for your API, including tests and a container build; require passing status\nbefore merge where available.",
    "readiness": "Explain every workflow event, job and step; show that an intentionally failing test blocks the required check, and\nidentify what the workflow token and secrets can access. State what a green CI run does not prove.",
    "recallQuestion": "Why should a test workflow triggered by an outside pull request normally have read-only repository permissions and no deployment secret?",
    "recallAnswer": "The pull request can contain code an untrusted contributor controls, and workflow steps may execute that code. If\nthe runner has write permissions or secrets, the code could use them. Grant only the permissions the check needs and\nkeep deployment authority in a separate, appropriately trusted workflow.",
    "references": "- [GitHub Actions: workflow syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions)\n- [GitHub Actions: secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)\n- [OWASP: CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html)",
    "related": "Activity A10; project specifications: Projects & Portfolio.",
    "sourcePdf": "02_Infrastructure_and_Cloud.pdf",
    "activityId": "A10"
  },
  {
    "id": 11,
    "title": "Continuous delivery, releases and rollback",
    "phase": "Infrastructure & Cloud",
    "level": "Core",
    "prerequisites": "Module 10 CI and basic service operations.",
    "intro": "Learn what changes between an artifact that passed tests and a version safely running for users.",
    "overview": "Continuous integration produces evidence about a particular source revision; continuous delivery keeps a\ndeployable artifact ready for promotion. Continuous deployment automatically releases it, which is not necessary\nfor a personal learning lab. Separate build and release so the image tested is the image deployed.\nA release is more than replacing a process. Configuration, database schema and external dependencies can make\nrollback unsafe even if the old container image is available. Prefer backward-compatible database changes and\nvalidate migrations independently; include backup/restore steps when the data matters.\nA smoke test should exercise a narrow but meaningful path after deployment, not only confirm that a TCP port\naccepts connections. Record which version was released, whether checks passed and which clear action restores\nthe previous known-good version.",
    "learningQuestion": "If the new version fails after deployment, what evidence and compatibility choices determine whether a rollback is safe?",
    "concepts": [
      {
        "label": "Promoting a tested artifact",
        "href": "#lesson-m11-l01"
      },
      {
        "label": "Safe release and compatibility",
        "href": "#lesson-m11-l02"
      },
      {
        "label": "Smoke tests and rollback",
        "href": "#lesson-m11-l03"
      }
    ],
    "lessons": [
      {
        "id": "M11-L01",
        "title": "Promoting a tested artifact"
      },
      {
        "id": "M11-L02",
        "title": "Safe release and compatibility"
      },
      {
        "id": "M11-L03",
        "title": "Smoke tests and rollback"
      }
    ],
    "practice": "Deploy two numbered versions in a disposable environment. Verify the new version label and a meaningful request,\nintroduce a controlled failure, return to the prior artifact and repeat the smoke check. Keep the test data and\nschema compatible with both versions.",
    "typicalMistakes": "Using latest tags without traceability, testing one image but deploying another, or relying on blind\nrestarts after a bad release.",
    "miniLab": "Create a deployment checklist and a script or documented procedure for versioned release plus\nmanual rollback.",
    "readiness": "Release an identifiable artifact, reproduce a failure, roll back without losing test data, and verify both service\nhealth and one user-facing request. Explain why the database change, if any, remains safe across that rollback.",
    "recallQuestion": "Why can changing the container image back to the previous version fail to restore the whole service?",
    "recallAnswer": "The deployment also depends on configuration, data schema and external side effects. The prior code may not read a\nnew incompatible schema, and restarting cannot undo messages or data already changed. Plan backward-compatible\nmigrations and verify the full user path after restoring the known-good artifact.",
    "references": "- [GitHub Actions: deploying with GitHub Actions](https://docs.github.com/en/actions/deployment/about-deployments/deploying-with-github-actions)\n- [Docker: image digests](https://docs.docker.com/dhi/core-concepts/digests/)\n- [OWASP: CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html)",
    "related": "Activity A11; project specifications: Projects & Portfolio.",
    "sourcePdf": "02_Infrastructure_and_Cloud.pdf",
    "activityId": "A11"
  },
  {
    "id": 12,
    "title": "Cloud concepts and Azure foundations",
    "phase": "Infrastructure & Cloud",
    "level": "Core",
    "prerequisites": "Linux, networks and basic service deployment.",
    "intro": "Learn one provider deeply enough to understand shared responsibility rather than memorizing\nservice names.",
    "overview": "",
    "learningQuestion": "When you create one small cloud VM, what else is created, which responsibilities remain yours, and what may still cost money after shutdown?",
    "concepts": [
      {
        "label": "Cloud service models and responsibility",
        "href": "#lesson-m12-l01"
      },
      {
        "label": "Azure resource dependencies",
        "href": "#lesson-m12-l02"
      },
      {
        "label": "Cost-aware experiments",
        "href": "#lesson-m12-l03"
      }
    ],
    "lessons": [
      {
        "id": "M12-L01",
        "title": "Cloud service models and responsibility"
      },
      {
        "id": "M12-L02",
        "title": "Azure resource dependencies"
      },
      {
        "id": "M12-L03",
        "title": "Cost-aware experiments"
      }
    ],
    "practice": "Draw resource ownership for one test VM; list every resource and investigate which could incur a charge\nafter a stop/deallocation.",
    "typicalMistakes": "Assuming the cloud provider secures your application, equating region with availability zone, or\nleaving disks/IPs after deleting the VM.",
    "miniLab": "Create a resource diagram and cleanup plan first. Provision one tiny Azure Linux lab only after reviewing current\nterms and accepting the potential cost; otherwise verify the dependency model with a local VM or documented example.\nIf you do provision it, inventory and remove every lab resource.",
    "readiness": "Explain each VM dependency, the shared-responsibility model and your cost-safe\ncleanup method.",
    "recallQuestion": "Why can stopping a VM reduce compute charges while the whole resource group can still incur cost?",
    "recallAnswer": "Stopping or deallocating a VM changes its compute state, but attached disks, public IP addresses, storage, snapshots,\nand other services have their own lifecycles and pricing. Inventory dependencies, check the current provider pricing,\nand verify cleanup rather than assuming that stopping or deleting one resource removes everything.",
    "references": "- [Azure shared responsibility](https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility/)\n- [Azure resource groups](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview)\n- [Azure virtual networks and virtual machines](https://learn.microsoft.com/en-us/azure/virtual-network/network-overview)\n- [Azure for Students](https://azure.microsoft.com/en-us/free/students/) — check current terms and eligibility",
    "related": "Activity A12; project specifications: Projects & Portfolio.",
    "sourcePdf": "02_Infrastructure_and_Cloud.pdf",
    "activityId": "A12"
  },
  {
    "id": 13,
    "title": "Cloud networking, IAM and cost controls",
    "phase": "Infrastructure & Cloud",
    "level": "Core",
    "prerequisites": "Modules 04 and 12.",
    "intro": "Operate a small cloud environment without accidentally exposing services or losing control of\ncosts.",
    "overview": "A virtual network and subnet organize address space, but access is also governed by security rules, route tables and\nhost firewalls. Do not assume that being on the same network automatically grants permission or that an\ninternet-facing public IP implies a service is running.\nIdentity answers who may perform a control-plane action; network controls decide which traffic can reach an\nendpoint. A role that can create VMs is not the same permission as an SSH account inside the guest. Apply the\nnarrowest practical privileges and avoid credentials committed to code.\nBudgets and alerts improve visibility but are not universal hard spending caps. Price depends on VM size, region,\nruntime, disk, outbound transfer and other resources. Always check active resources, cost estimates, and the\nsubscription billing status. Never use a credit card solely because a lab seems free without checking the exact offer.",
    "learningQuestion": "If a cloud host is reachable from one network but not another, which separate identity, network, guest-OS, and cost controls should you inspect?",
    "concepts": [
      {
        "label": "Network paths and exposure",
        "href": "#lesson-m13-l01"
      },
      {
        "label": "Identity and authorization",
        "href": "#lesson-m13-l02"
      },
      {
        "label": "Cost limits and cleanup",
        "href": "#lesson-m13-l03"
      }
    ],
    "lessons": [
      {
        "id": "M13-L01",
        "title": "Network paths and exposure"
      },
      {
        "id": "M13-L02",
        "title": "Identity and authorization"
      },
      {
        "id": "M13-L03",
        "title": "Cost limits and cleanup"
      }
    ],
    "practice": "In a disposable cloud lab, allow a test connection only from your current approved address. Demonstrate a denied\nconnection from a disallowed source where practical, inspect the NSG and host firewall rules, and remove the rule\nafter verifying the allowed path. If you cannot safely create cloud resources, complete the same review on a diagram.",
    "typicalMistakes": "Opening 0.0.0.0/0 on administrative ports, using subscription owner credentials in CI, and relying\non alerts as an automatic shutoff.",
    "miniLab": "Build a resource inventory and short security review for a single-VM Azure application.",
    "readiness": "List allowed inbound connections and the identity that owns each. Explain which control denied a test request,\njustify each remaining permission, and show that unused cloud resources were removed.",
    "recallQuestion": "Does granting a user Azure's VM management role automatically give that user a Linux shell account or permission to call the web API?",
    "recallAnswer": "No. Cloud RBAC controls operations on Azure resources. Guest OS authentication and application authorization are\nseparate systems with separate identities and policies. Trace each access path to its enforcing control instead of\nassuming one role grants access everywhere.",
    "references": "- [Microsoft Learn: virtual network concepts](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-overview)\n- [Microsoft Learn: Network Security Groups](https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview)\n- [Microsoft Learn: Azure RBAC](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview)\n- [Azure for Students: current offer](https://azure.microsoft.com/en-us/free/students/)",
    "related": "Activity A13; project specifications: Projects & Portfolio.",
    "sourcePdf": "02_Infrastructure_and_Cloud.pdf",
    "activityId": "A13"
  },
  {
    "id": 14,
    "title": "Terraform and Infrastructure as Code",
    "phase": "Infrastructure & Cloud",
    "level": "Core",
    "prerequisites": "Basic cloud resources, Docker and Git.",
    "intro": "Make infrastructure explicit, reviewable and reproducible instead of manually rebuilding the same\nenvironment.",
    "overview": "Terraform compares a desired configuration against observed and recorded resource state to propose changes. The\nplan is a prediction based on the provider and current state, not a substitute for reading the consequences. Review\ncreates, updates and destroys, especially for resources that hold persistent data.\nTerraform state can contain sensitive values and resource identifiers. Keep it out of public repositories; choose a\nsuitable protected storage backend when collaboration requires shared state. Never edit state casually to “fix” a drift\nissue without understanding the consequences.\nStart with the official local Docker exercises; only later provision a small Azure resource group and VM. This avoids\nspending credits while learning syntax. Terraform manages resource lifecycles, while Ansible is usually better suited\nto configuring an operating system inside a provisioned VM.",
    "learningQuestion": "How can you predict an infrastructure change before it runs, and what records let Terraform connect configuration to real resources?",
    "concepts": [
      {
        "label": "Desired configuration and plans",
        "href": "#lesson-m14-l01"
      },
      {
        "label": "State, dependencies, and drift",
        "href": "#lesson-m14-l02"
      },
      {
        "label": "Safe lifecycle and collaboration",
        "href": "#lesson-m14-l03"
      }
    ],
    "lessons": [
      {
        "id": "M14-L01",
        "title": "Desired configuration and plans"
      },
      {
        "id": "M14-L02",
        "title": "State, dependencies, and drift"
      },
      {
        "id": "M14-L03",
        "title": "Safe lifecycle and collaboration"
      }
    ],
    "practice": "Use a local Docker provider or a mock configuration. Run `fmt`, `validate` and `plan`, change one variable, then\nreview the proposed difference before applying. Make one controlled out-of-band change and inspect the resulting\ndrift. Destroy only the disposable objects after checking the target workspace and plan.",
    "typicalMistakes": "Committing state to Git, assuming apply is always reversible, running destroy on the wrong\nworkspace or forgetting that data volumes may be deleted.",
    "miniLab": "Provision a local Docker resource first, then optionally reproduce one Azure network resource\nafter reviewing cost.",
    "readiness": "Explain how the plan was derived, identify a resource dependency, find an out-of-band change, and reject a plan that\nwould destroy unintended data. Recreate and clean up only a disposable target while preserving a state backup.",
    "recallQuestion": "What does `terraform plan` prove, and why must you still review it immediately before `apply`?",
    "recallAnswer": "Plan shows proposed actions based on configuration, state and provider observations at that time; it does not apply\nthem or guarantee that live infrastructure will remain unchanged. Review creates, updates, deletes, target workspace\nand data consequences before applying. Re-plan if important state or configuration has changed.",
    "references": "- [Terraform: provisioning workflow](https://developer.hashicorp.com/terraform/cli/run)\n- [Terraform: state](https://developer.hashicorp.com/terraform/language/state)\n- [Terraform: plan command](https://developer.hashicorp.com/terraform/cli/commands/plan)",
    "related": "Activity A14; project specifications: Projects & Portfolio.",
    "sourcePdf": "02_Infrastructure_and_Cloud.pdf",
    "activityId": "A14"
  },
  {
    "id": 15,
    "title": "Ansible and configuration management",
    "phase": "Infrastructure & Cloud",
    "level": "Core",
    "prerequisites": "Linux administration, YAML reading and SSH.",
    "intro": "Configure software repeatably after provisioning a machine, including the ability to audit changes.",
    "overview": "Ansible connects to managed hosts, typically through SSH, and applies tasks describing their desired configuration.\nA package module knows how to determine whether a package is already installed; a blind shell install command\nmay run unnecessarily on every execution.\nIdempotency means repeating the same desired-state operation does not keep changing the system; it does not\nimply every playbook or custom shell task is safe to repeat. Test repeated executions and inspect changed and failed\ncounts. Handlers should run when a relevant configuration actually changes.\nSeparate environment-specific variables from reusable roles and templates, keep secret values in a proper protected\nmechanism, and review privilege escalation per task. Prefer a disposable VM for testing a new playbook before\nletting it touch valuable systems.",
    "learningQuestion": "How can the same playbook safely bring a fresh machine into the desired state and avoid unnecessary changes when run again?",
    "concepts": [
      {
        "label": "Inventory and desired state",
        "href": "#lesson-m15-l01"
      },
      {
        "label": "Modules, handlers, and idempotency",
        "href": "#lesson-m15-l02"
      },
      {
        "label": "Check mode and privilege",
        "href": "#lesson-m15-l03"
      }
    ],
    "lessons": [
      {
        "id": "M15-L01",
        "title": "Inventory and desired state"
      },
      {
        "id": "M15-L02",
        "title": "Modules, handlers, and idempotency"
      },
      {
        "id": "M15-L03",
        "title": "Check mode and privilege"
      }
    ],
    "practice": "In a disposable Ubuntu VM, run a short playbook to install one package and template a service configuration. Run it\nagain and compare changed-task counts. Alter the test config manually, run check mode, then reapply and verify the\nservice. Review each privileged task before using Activity A15 on a fresh VM.",
    "typicalMistakes": "Using shell commands for every task, disabling host-key checks without reason, or believing check\nmode simulates every custom operation perfectly.",
    "miniLab": "Configure a clean Ubuntu VM with a service account, runtime packages, NGINX and the status\nservice.",
    "readiness": "Reproduce the setup on a fresh VM, explain why a second run did not make unintended changes, and describe every\nprivileged operation with a rollback option. Identify one task that check mode cannot fully predict.",
    "recallQuestion": "If an Ansible playbook reports a changed task on every run, does that prove useful work is still happening?",
    "recallAnswer": "No. The task may be written in a non-idempotent way, such as appending duplicate text or running an opaque shell\ncommand. Inspect the task and actual file/service state, then prefer a module that declares the desired state or a\nguard that can be tested. Check mode is helpful but depends on module support.",
    "references": "- [Ansible: playbooks introduction](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_intro.html)\n- [Ansible: check and diff mode](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html)\n- [Ansible: handlers](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html)",
    "related": "Activity A15; project specifications: Projects & Portfolio.\nNext steps\nOnce you can build, test, provision, configure and deploy a small service repeatably, continue to\n03_Operations_and_Security.pdf. Choose monitoring and incident response before adding large-scale orchestration.",
    "sourcePdf": "02_Infrastructure_and_Cloud.pdf",
    "activityId": "A15"
  },
  {
    "id": 16,
    "title": "Logs, metrics and traces",
    "phase": "Operations & Security",
    "level": "Core",
    "prerequisites": "Running service; Python and basic networking.",
    "intro": "Build the mental tools required to observe a system rather than guessing why it behaves badly.",
    "overview": "Logs are records of events; metrics summarize measurements over time; traces connect work performed across\nservice boundaries. They answer different questions. A log may identify the error for one request, while a metric\nreveals that a failure rate increased after a deployment.\nAdd request IDs and meaningful status fields to application logs, but avoid recording passwords, tokens and\npersonal data. Metrics such as request rate, error rate and latency can indicate customer impact. High-cardinality\nlabels such as unique user IDs can make time-series systems expensive and hard to operate.\nA distributed trace represents causal relationships among operations, but instrumentation itself has cost and\ncomplexity. For your initial lab, prefer clean JSON logs and a few stable metrics before adopting a full tracing stack.\nExplain the trade-off rather than adding agents blindly.",
    "learningQuestion": "When one request fails, how can logs, metrics, and traces answer different parts of the investigation without collecting sensitive data?",
    "concepts": [
      {
        "label": "Logs and request context",
        "href": "#lesson-m16-l01"
      },
      {
        "label": "Metrics and distributions",
        "href": "#lesson-m16-l02"
      },
      {
        "label": "Traces and correlation",
        "href": "#lesson-m16-l03"
      }
    ],
    "lessons": [
      {
        "id": "M16-L01",
        "title": "Logs and request context"
      },
      {
        "id": "M16-L02",
        "title": "Metrics and distributions"
      },
      {
        "id": "M16-L03",
        "title": "Traces and correlation"
      }
    ],
    "practice": "Generate a successful and a controlled failing request. Record structured fields without bodies or credentials,\ncompare the error counter and latency distribution, and find the corresponding log using an opaque request ID.\nInspect the metrics endpoint and identify any label that could grow once per request.",
    "typicalMistakes": "Calling uptime a sufficient reliability metric, ignoring time zones and clock skew, or logging secrets\nand request bodies indiscriminately.",
    "miniLab": "Instrument the Status API with structured logs and request counters, then create a short\ntroubleshooting note.",
    "readiness": "Find one failed request, explain its error reason from logs, and use a metric to decide whether the failure is\nisolated or widespread. Identify whether a trace is needed to answer any remaining cross-service question.",
    "recallQuestion": "Which signal is best for finding the details of one failed request, and which is better for seeing whether failures are increasing over time?",
    "recallAnswer": "A structured log is usually best for the event details of one request. A counter or rate derived from metrics is better\nfor the trend and scope over time. A trace can help locate where work stalled across services. Combine signals using\nconsistent context, while avoiding sensitive fields and unbounded metric labels.",
    "references": "- [OpenTelemetry: observability primer](https://opentelemetry.io/docs/concepts/observability-primer/)\n- [Prometheus: metric types](https://prometheus.io/docs/concepts/metric_types/)\n- [Prometheus: naming and labels](https://prometheus.io/docs/practices/naming/)",
    "related": "Activity A16; project specifications: Projects & Portfolio.",
    "sourcePdf": "03_Operations_and_Security.pdf",
    "activityId": "A16"
  },
  {
    "id": 17,
    "title": "Monitoring, dashboards and alert design",
    "phase": "Operations & Security",
    "level": "Core",
    "prerequisites": "Module 16 observability.",
    "intro": "Detect failures proactively and make dashboards that support decisions rather than just display\nattractive charts.",
    "overview": "Prometheus scrapes metrics endpoints on a schedule and stores time-series observations. A scraper being reachable\ndoes not guarantee the application is correctly serving requests, so include synthetic or application-level health\nchecks.\nDashboards should show what a responder needs: service availability, recent deployments, latency, errors and host\nsaturation. A graph without units or a clear question can hide a problem rather than reveal it. Alert on conditions\nthat need action; otherwise notifications become noise and are ignored.\nAn alert should identify the affected service, symptom, expected action and link to a runbook. Test alert recovery as\nwell as firing, and distinguish an infrastructure symptom from customer impact. Start locally with Prometheus and\nGrafana; do not pay for a managed telemetry platform simply to build your first dashboard.",
    "learningQuestion": "How can a dashboard and alert tell an operator that users are affected and what action to take, instead of merely showing a changing graph?",
    "concepts": [
      {
        "label": "From scrape to decision",
        "href": "#lesson-m17-l01"
      },
      {
        "label": "Service and user health",
        "href": "#lesson-m17-l02"
      },
      {
        "label": "Actionable alerts and runbooks",
        "href": "#lesson-m17-l03"
      }
    ],
    "lessons": [
      {
        "id": "M17-L01",
        "title": "From scrape to decision"
      },
      {
        "id": "M17-L02",
        "title": "Service and user health"
      },
      {
        "id": "M17-L03",
        "title": "Actionable alerts and runbooks"
      }
    ],
    "practice": "Stop a service in a controlled lab; watch scrape targets, error rates and an alert rule; note how long\ndetection takes.",
    "typicalMistakes": "Alerting on every metric spike, overlooking missing telemetry, and treating dashboards as\nsubstitutes for incident procedures.",
    "miniLab": "Build a local service dashboard with one actionable alert and a concise response runbook.",
    "readiness": "Prove the alert fires and clears during a controlled incident; explain the difference\nbetween service and host health.",
    "recallQuestion": "If Prometheus stops receiving a target's metrics, does a dashboard value frozen at its last sample mean the service is healthy?",
    "recallAnswer": "No. A stale value is not current evidence. Display target or data freshness and treat missing telemetry as its own\ncondition. Use an independent application check or another signal to determine whether the service is serving users.",
    "references": "- [Prometheus: getting started](https://prometheus.io/docs/prometheus/latest/getting_started/)\n- [Prometheus: alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)\n- [Google SRE Workbook: alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)",
    "related": "Activity A17; project specifications: Projects & Portfolio.",
    "sourcePdf": "03_Operations_and_Security.pdf",
    "activityId": "A17"
  },
  {
    "id": 18,
    "title": "Kubernetes architecture, workloads and operations",
    "phase": "Operations & Security",
    "level": "Intermediate",
    "prerequisites": "Linux, networking, Docker and Compose (01-09).",
    "intro": "Understand orchestration without assuming Kubernetes is required for every small application.",
    "overview": "Kubernetes declares a desired workload state and controllers continuously reconcile actual state toward it. A\nDeployment describes replicas and update behavior; Pods are the scheduling unit and can be replaced at any time.\nDesign your app so an instance can restart without losing essential state.\nA Service gives a stable discovery and routing abstraction for changing Pods. It is not the same as a container port or\nan external load balancer. Namespaces group resources but are not automatically a strong security boundary.\nKubernetes adds significant operational complexity: API authentication, scheduling, storage, networking and\nupgrade maintenance. Learn it using a local cluster such as kind or minikube after you can deploy and debug the\nsame application with Compose. Managed Kubernetes in the cloud is unnecessary for the initial learning objective.\nReadiness probes decide whether an instance receives service traffic; liveness probes can restart it when a defined\nunrecoverable condition occurs. A liveness check that is too strict may create restart loops during temporary load.\nRequests inform scheduling, while limits constrain resource usage; tune them using observed behavior rather than\narbitrary tiny values.\nA rolling update reduces disruption when workloads are sufficiently replicated and their readiness conditions are\ncorrect. It does not guarantee zero downtime for single-replica services or incompatible database changes. Record\nrollout status, failures and rollback steps.\nPersistent volumes introduce storage lifecycle decisions that do not disappear because the application is\ncontainerized. Limit RBAC privileges, protect sensitive Kubernetes objects and avoid exposing the cluster dashboard\nor API broadly. Cluster upgrades and node security are major future topics, not prerequisites for your first local\ndeployment.",
    "learningQuestion": "How does Kubernetes keep a requested application available when Pods are replaceable, and what evidence shows a rollout is safe?",
    "concepts": [
      {
        "label": "Control plane and desired state",
        "href": "#lesson-m18-l01"
      },
      {
        "label": "Pods, Deployments, and Services",
        "href": "#lesson-m18-l02"
      },
      {
        "label": "Probes, rollout, and resources",
        "href": "#lesson-m18-l03"
      }
    ],
    "lessons": [
      {
        "id": "M18-L01",
        "title": "Control plane and desired state"
      },
      {
        "id": "M18-L02",
        "title": "Pods, Deployments, and Services"
      },
      {
        "id": "M18-L03",
        "title": "Probes, rollout, and resources"
      }
    ],
    "practice": "Deploy an API locally; scale replicas, delete one Pod, inspect replacement behavior and test service\ndiscovery. Also: Push a broken image tag or bad readiness route in a lab; inspect rollout status; roll back to a working\nrevision.",
    "typicalMistakes": "Mapping one Pod to one virtual machine, depending on Pod IPs staying fixed, or treating a local\nKubernetes lab as production-ready. Using liveness probes for dependency readiness, omitting resource requests, or\ncopying wide-open example RBAC to real clusters.",
    "miniLab": "In an isolated local cluster, create a small Deployment and Service for your status API. Demonstrate a controlled rollout, diagnose a failed rollout, and recover safely.",
    "readiness": "Explain Pod versus Deployment versus Service and troubleshoot one failed rollout\nusing kubectl. Explain probes, resource controls and safe rollout conditions without following exact tutorial steps.",
    "recallQuestion": "What does a readiness probe do that a liveness probe does not, and why should the two checks not always be identical?",
    "recallAnswer": "Readiness controls whether the Pod should receive Service traffic. Liveness determines whether Kubernetes should\nrestart a container. A temporary dependency issue may make a Pod unready without making its process unrecoverable;\nusing that condition as liveness can cause needless restarts. Choose each check for the failure it should detect.",
    "references": "- [Kubernetes: cluster components](https://kubernetes.io/docs/concepts/overview/components/)\n- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)\n- [Kubernetes: Services](https://kubernetes.io/docs/concepts/services-networking/service/)\n- [Kubernetes: configure liveness, readiness, and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)\n\nKubernetes - Basic Tutorials",
    "related": "Activity A18; project specifications: Projects & Portfolio.",
    "sourcePdf": "03_Operations_and_Security.pdf",
    "activityId": "A18"
  },
  {
    "id": 19,
    "title": "Infrastructure and application security",
    "phase": "Operations & Security",
    "level": "Core",
    "prerequisites": "Linux, networking, API runtime and CI basics.",
    "intro": "Add security boundaries to the same systems you already understand instead of memorizing\nsecurity products.",
    "overview": "Security begins with knowing which identities, services and interfaces exist and what each can access. A\nleast-privilege account cannot necessarily prevent all compromise, but it reduces the damage of a stolen credential\nor buggy process. Define trust boundaries across browser, reverse proxy, API, database and deployment runner.\nKeep test systems separated from personal or organization production environments; apply patches and remove\nunused services. For a demo exposed to the internet, a simple architecture with minimal listening ports is preferable\nto a complicated stack full of unmaintained dependencies.\nThreat modeling need not be elaborate: identify valuable assets, likely failure/abuse paths and feasible mitigations.\nValidate that auth and network controls behave as intended rather than relying on labels such as \"secure\" or a\nsuccessful vulnerability scan alone.",
    "learningQuestion": "If an attacker gains control of one service account or port, what could they reach next, and which observable control would limit that path?",
    "concepts": [
      {
        "label": "Assets, trust boundaries, and threats",
        "href": "#lesson-m19-l01"
      },
      {
        "label": "Reduce exposure and privilege",
        "href": "#lesson-m19-l02"
      },
      {
        "label": "Verify a control",
        "href": "#lesson-m19-l03"
      }
    ],
    "lessons": [
      {
        "id": "M19-L01",
        "title": "Assets, trust boundaries, and threats"
      },
      {
        "id": "M19-L02",
        "title": "Reduce exposure and privilege"
      },
      {
        "id": "M19-L03",
        "title": "Verify a control"
      }
    ],
    "practice": "List exposed ports, identities and data stores for the Status API lab. In a disposable copy, close one unnecessary\npath, confirm the intended request still works and the unwanted request is denied, then document evidence and\nresidual risks.",
    "typicalMistakes": "Assuming Docker isolation replaces OS security, publishing a database to the internet, or treating\na green security scanner as a security guarantee.",
    "miniLab": "Write a one-page threat model and a hardened configuration checklist for the Status API lab.",
    "readiness": "Justify each privileged identity, listener and data store. Demonstrate one control with an allowed and denied test,\nand identify at least one unresolved risk without claiming a scan certifies the system.",
    "recallQuestion": "Why should a threat model connect an asset to a trust boundary and a plausible attack path instead of only listing security tools?",
    "recallAnswer": "The asset explains what harm matters, the boundary shows where trust or authority changes, and the attack path\nexplains how harm could occur. A mitigation can then be chosen and tested at that boundary. Tools are useful only\nwhen they reduce a stated risk and produce evidence.",
    "references": "- [NIST SP 800-218: Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final)\n- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)\n- [OWASP: Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)",
    "related": "Activity A19; project specifications: Projects & Portfolio.",
    "sourcePdf": "03_Operations_and_Security.pdf",
    "activityId": "A19"
  },
  {
    "id": 20,
    "title": "Secrets, identities and secure configuration",
    "phase": "Operations & Security",
    "level": "Core",
    "prerequisites": "Modules 10-15, especially CI and cloud permissions.",
    "intro": "Keep credentials and deployment authority out of source code, images and accidental log output.",
    "overview": "A secret is any value whose disclosure would grant access or expose protected information. Environment variables\ncan be convenient configuration carriers but are not automatically secret storage; values may appear in process\nenvironments, debug output or CI logs. Rotate and revoke credentials after suspected exposure.\nLong-lived cloud keys in GitHub Actions create a difficult maintenance and leakage risk. When supported, OIDC\nfederated authentication lets a short-lived workflow identity exchange a trusted token for scoped cloud access.\nRestrict which repositories, branches and environments can request that identity.\nTreat identity and authorization separately: authentication proves who the caller is, while authorization limits what it\nmay do. Document owners, scopes and expiration conditions. Test failure with insufficient permission before raising\na role to owner; the narrower change is usually safer.",
    "learningQuestion": "How can a deployment prove who it is and receive only the access it needs without storing a long-lived cloud password in the repository?",
    "concepts": [
      {
        "label": "Configuration and secret lifecycle",
        "href": "#lesson-m20-l01"
      },
      {
        "label": "Identity, authentication, and authorization",
        "href": "#lesson-m20-l02"
      },
      {
        "label": "Federated deployment identity",
        "href": "#lesson-m20-l03"
      }
    ],
    "lessons": [
      {
        "id": "M20-L01",
        "title": "Configuration and secret lifecycle"
      },
      {
        "id": "M20-L02",
        "title": "Identity, authentication, and authorization"
      },
      {
        "id": "M20-L03",
        "title": "Federated deployment identity"
      }
    ],
    "practice": "Use a fake, nonfunctional token in a disposable test. Trigger an authentication failure and verify that logs show a\nredacted reason without the token value. Review a workflow permission block and, if available in your lab, map the\nOIDC trust conditions to one approved branch and environment.",
    "typicalMistakes": "Using root or owner roles for convenience, leaking secrets in build args, and forgetting to revoke\ncredentials once committed.",
    "miniLab": "Prepare a nonsecret configuration template, credential inventory and GitHub Actions security\nreview.",
    "readiness": "For each test credential, name its owner, location, scope, rotation and revocation path. Show a safe failed\nauthentication without value disclosure, and explain the difference between identity, credential, authentication\nand authorization.",
    "recallQuestion": "If a secret is removed from the latest commit after it was pushed, is the credential safe to keep using?",
    "recallAnswer": "No. The value may remain in repository history, clones, logs, caches or external systems. Revoke or rotate the\ncredential first, investigate where it was exposed, and then remove it from current files and history as appropriate.\nThe credential lifecycle matters more than the visible file change.",
    "references": "- [GitHub Actions: OpenID Connect](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect)\n- [OWASP: Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)\n- [Microsoft Learn: workload identity federation](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation)\n\nGitHub - Secure deployment and OIDC, OWASP - CI/CD Security Cheat Sheet",
    "related": "Activity A20; project specifications: Projects & Portfolio.",
    "sourcePdf": "03_Operations_and_Security.pdf",
    "activityId": "A20"
  },
  {
    "id": 21,
    "title": "Software supply chain and secure CI/CD",
    "phase": "Operations & Security",
    "level": "Intermediate",
    "prerequisites": "Docker, CI/CD, secure identity and dependency basics.",
    "intro": "Understand how dependency, build and artifact compromise can undermine otherwise correct\nsource code.",
    "overview": "A build consumes more than your own code: package dependencies, base images, action dependencies, compiler\ntoolchains and configuration can all change its behavior. Record versions, review dependency updates and restrict\nwho can alter the pipeline.\nVulnerability scanners identify known problems within their coverage; results require triage. They do not prove that\nthe build process is trustworthy or that the running application is safe. A software bill of materials describes known\ncomponents but is not a substitute for testing and patching.\nThe NIST SSDF provides practices to prepare, protect software, produce well-secured software and respond to\nvulnerabilities. OWASP CI/CD guidance emphasizes protecting pipeline access, secrets, dependencies and artifacts.\nUse these as a basis for a small practical checklist rather than claiming full compliance with a complex standard.",
    "learningQuestion": "How can you trace what went into a released artifact and decide what evidence supports trusting it?",
    "concepts": [
      {
        "label": "Build inputs and dependency review",
        "href": "#lesson-m21-l01"
      },
      {
        "label": "Artifact identity and provenance",
        "href": "#lesson-m21-l02"
      },
      {
        "label": "Security gates and limits",
        "href": "#lesson-m21-l03"
      }
    ],
    "lessons": [
      {
        "id": "M21-L01",
        "title": "Build inputs and dependency review"
      },
      {
        "id": "M21-L02",
        "title": "Artifact identity and provenance"
      },
      {
        "id": "M21-L03",
        "title": "Security gates and limits"
      }
    ],
    "practice": "Add dependency and image scanning to a test pipeline. Record the source revision and resulting image digest, inspect\none finding, and document how it would be triaged. Add an intentionally failing gate in a throwaway branch and\nverify that release promotion is blocked.",
    "typicalMistakes": "Pinning nothing, giving an untrusted pull request deployment keys, and interpreting a scanner exit\ncode as a comprehensive security audit.",
    "miniLab": "Create a secure pipeline that tests, scans, versions and records a deployable container artifact.",
    "readiness": "Show that a failing security gate blocks promotion, trace the image digest to its source revision, and explain what\nthe selected scanner and SBOM cannot establish about runtime safety.",
    "recallQuestion": "Does generating an SBOM and passing a vulnerability scan prove that a container is safe to deploy?",
    "recallAnswer": "No. An SBOM improves component visibility and a scan checks known issues within its coverage. Neither proves\nartifact provenance, workflow integrity, correct application behavior or absence of unknown vulnerabilities. Use\nthem as separate evidence alongside tests, permissions, artifact verification and operational checks.",
    "references": "- [NIST SP 800-218: SSDF](https://csrc.nist.gov/pubs/sp/800/218/final)\n- [SLSA: provenance and build levels](https://slsa.dev/spec/v1.1/levels)\n- [GitHub: artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations)\n- [OWASP: CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html)",
    "related": "Activity A21; project specifications: Projects & Portfolio.",
    "sourcePdf": "03_Operations_and_Security.pdf",
    "activityId": "A21"
  },
  {
    "id": 22,
    "title": "Site reliability engineering and service objectives",
    "phase": "Operations & Security",
    "level": "Intermediate",
    "prerequisites": "Monitoring, deployments and operating a service.",
    "intro": "Practice balancing availability, feature delivery and operational work with measurements and\nrealistic service expectations.",
    "overview": "An SLI is a measurement such as successful requests divided by total eligible requests; an SLO is a target for that\nmeasurement over a specified window. Different systems value different user journeys, so start with an observable\nendpoint and an explicit definition of what success means.\nAn error budget describes tolerated unreliability relative to an SLO. For a hobby lab, avoid copying a stringent\nproduction target that you cannot measure or support; choose a learning objective you can test and explain.\nReliability is not only uptime: correct data, recovery and maintainability also matter.\nToil is repetitive operational work that scales with service demand and requires human attention. Automation helps\nwhen it removes a repeatable source of toil without introducing hidden failure modes. Postmortems should explain\ncontributing conditions and improvement actions, not assign blame or invent certainty.",
    "learningQuestion": "How do you measure reliability from the user's point of view, and what should change when observed performance falls short of the goal?",
    "concepts": [
      {
        "label": "Define a useful SLI and SLO",
        "href": "#lesson-m22-l01"
      },
      {
        "label": "Calculate and interpret an error budget",
        "href": "#lesson-m22-l02"
      },
      {
        "label": "Toil and learning from incidents",
        "href": "#lesson-m22-l03"
      }
    ],
    "lessons": [
      {
        "id": "M22-L01",
        "title": "Define a useful SLI and SLO"
      },
      {
        "id": "M22-L02",
        "title": "Calculate and interpret an error budget"
      },
      {
        "id": "M22-L03",
        "title": "Toil and learning from incidents"
      }
    ],
    "practice": "Define one SLI from a sample log set, write what counts as an eligible and successful request, calculate the ratio,\nand compare it with a clearly labeled lab SLO. Propose a small policy that responds to repeated failure without\npretending the sample predicts production behavior.",
    "typicalMistakes": "Chasing 100% uptime, hiding incidents, or treating a single availability metric as proof of user\nsatisfaction.",
    "miniLab": "Write a service-level objective page, an incident classification and a small automation\nopportunity assessment.",
    "readiness": "Show your data source, measurement window, inclusion rules and calculation. Explain what the SLO helps decide and\nwhen the sample size or missing data makes its result misleading.",
    "recallQuestion": "What extra information is needed to interpret an SLI percentage besides its numerator and denominator?",
    "recallAnswer": "You need to know what counts as an eligible event and a success, the measurement window, exclusions and data source.\nWithout those, two percentages may measure different user experiences. Sample size and missing telemetry also\nlimit how confidently the result can guide a release decision.",
    "references": "- [Google SRE Workbook: implementing SLOs](https://sre.google/workbook/implementing-slos/)\n- [Google SRE Workbook: error budget policy](https://sre.google/workbook/error-budget-policy/)\n- [Google SRE Book: monitoring distributed systems](https://sre.google/sre-book/monitoring-distributed-systems/)\n\nGoogle - SRE Books",
    "related": "Activity A22; project specifications: Projects & Portfolio.",
    "sourcePdf": "03_Operations_and_Security.pdf",
    "activityId": "A22"
  },
  {
    "id": 23,
    "title": "Incidents, backups, recovery and disaster scenarios",
    "phase": "Operations & Security",
    "level": "Core",
    "prerequisites": "Linux operations, cloud basics, and monitoring. Review the relevant earlier modules when those concepts are unfamiliar.",
    "intro": "Practice stabilizing an incident, restoring synthetic data from a verified backup, and explaining what the drill does and does not prove.",
    "overview": "An incident response begins with establishing user impact, the recent changes and current symptoms. Stabilize the\nservice before making speculative changes, preserve useful logs and record a timeline. The nearest visible error may\nbe a downstream symptom, not the initiating cause.\nA backup that has never been restored is an unverified assumption. Recovery point objective (RPO) describes\nacceptable data loss, while recovery time objective (RTO) describes an acceptable recovery duration. Define them\nfor the lab without claiming the system actually meets them until a drill proves it.\nRollback, restart, restore and failover are different responses. A new application version may roll back quickly, but\nincompatible data migration can make rollback dangerous. Keep repeatable restoration instructions and practice the\ncomplete workflow on isolated disposable infrastructure.",
    "learningQuestion": "If a deployment damages data and a service becomes unavailable, how do you establish impact, restore safely, and prove the recovery worked?",
    "concepts": [
      {
        "label": "Triage incidents and preserve useful evidence",
        "href": "#lesson-m23-l01"
      },
      {
        "label": "Use backups to reason about RPO and RTO",
        "href": "#lesson-m23-l02"
      },
      {
        "label": "Restore into isolation and verify recovery",
        "href": "#lesson-m23-l03"
      }
    ],
    "lessons": [
      {
        "id": "M23-L01",
        "title": "Triage incidents and preserve useful evidence"
      },
      {
        "id": "M23-L02",
        "title": "Use backups to reason about RPO and RTO"
      },
      {
        "id": "M23-L03",
        "title": "Restore into isolation and verify recovery"
      }
    ],
    "practice": "Complete Activity A23 with synthetic records in a newly created temporary directory. The drill tests SQLite backup and restore behavior; it does not stop or change the Fieldnotes service.",
    "typicalMistakes": "Treating a successful backup job as proof of recoverability, restoring over the source, confusing RPO with RTO, and reporting a database-only drill as proof of full service recovery.",
    "miniLab": "Create a synthetic SQLite backup, simulate the loss of known rows, restore into a separate target, verify the restored record IDs, and measure the observed recovery window.",
    "readiness": "Explain what the backup contains, which synthetic records were lost after its cutoff, how integrity and application-level checks differ, and what additional evidence a full service recovery test would require.",
    "recallQuestion": "What do RPO and RTO measure, and which observed results from a restore drill can support each claim?",
    "recallAnswer": "RPO is the acceptable data-loss interval; RTO is the acceptable recovery duration. A drill must measure the recovered data point and elapsed recovery process. A database-only exercise cannot establish full application or service RTO without testing those layers too.",
    "references": "- [NIST SP 800-61 Rev. 3: Incident response and cybersecurity risk management](https://csrc.nist.gov/pubs/sp/800/61/r3/final)\n- [NIST SP 800-184: Guide for Cybersecurity Event Recovery](https://csrc.nist.gov/pubs/sp/800/184/final)\n- [NIST SP 800-34 Rev. 1: Contingency planning](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)\n- [Google SRE Workbook: Incident response](https://sre.google/workbook/incident-response/)",
    "related": "Activity A23; Project P3; Modules 16, 17, and 22.",
    "sourcePdf": "03_Operations_and_Security.pdf",
    "activityId": "A23"
  },
  {
    "id": 24,
    "title": "DevSecOps integration and architecture judgment",
    "phase": "Operations & Security",
    "level": "Specialization",
    "prerequisites": "Most previous modules; revisit any weak foundation.",
    "intro": "Combine delivery, security, observability and recovery into a defendable architecture without piling\non tools needlessly.",
    "overview": "DevSecOps is the integration of security practices into how software is developed, deployed and operated; it is not\nsimply a vulnerability scanner added at the end of a pipeline. Build protections into changes at the earliest stage\nwhere they are effective and practical.\nSelect tools based on a concrete operational question. A small FastAPI service may need GitHub Actions, Docker,\nAnsible and a single Azure VM; adding managed Kubernetes and multiple cloud vendors without user or reliability\nneeds increases complexity. Explain why an omitted tool is not necessary.\nFor a complete system, trace one release from a Git commit through tests, build and artifact identity, approved\ndeployment, health verification, monitoring, incident handling and recovery. Describe the trust boundaries, who has\nprivileged access and what an attacker or careless operator could change. This technical narrative is portfolio\nevidence of judgment rather than a stack of product logos.",
    "learningQuestion": "Can you trace one change from source commit to safe deployment, observe its behavior, and explain how you would recover without adding tools the system does not need?",
    "concepts": [
      {
        "label": "Risk-based design and boundaries",
        "href": "#lesson-m24-l01"
      },
      {
        "label": "Trace a complete release",
        "href": "#lesson-m24-l02"
      },
      {
        "label": "Architecture decisions and handover",
        "href": "#lesson-m24-l03"
      }
    ],
    "lessons": [
      {
        "id": "M24-L01",
        "title": "Risk-based design and boundaries"
      },
      {
        "id": "M24-L02",
        "title": "Trace a complete release"
      },
      {
        "id": "M24-L03",
        "title": "Architecture decisions and handover"
      }
    ],
    "practice": "Audit your capstone architecture using an explicit rubric: functionality, reliability, security, maintainability,\ncost and independent explainability.",
    "typicalMistakes": "Treating compliance labels as proof, automating destructive steps without review, and losing\noperational visibility across too many services.",
    "miniLab": "Produce a concise architecture decision record and a complete operational demonstration for\nyour capstone.",
    "readiness": "Defend one important tradeoff, reproduce a release safely and demonstrate recovery\nfrom a controlled failure.",
    "recallQuestion": "What evidence would let another learner verify a release from source to runtime, and which single green check cannot establish all of it?",
    "recallAnswer": "Useful evidence includes a reviewed commit, test results, build inputs, artifact identity, deployment record, runtime\nhealth and telemetry, and a tested recovery path. No single green CI check, scanner result or health endpoint proves\nthe whole chain. State what each check covers and what remains unverified.",
    "references": "- [NIST SP 800-218: Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final)\n- [OWASP: CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html)\n- [Google SRE Workbook: production readiness](https://sre.google/workbook/production-readiness/)\n\nNIST - Secure Software Development Framework, OWASP - CI/CD Security Cheat Sheet, Google - SRE Books",
    "related": "Activity A24; project specifications: Projects & Portfolio.\nNext steps\nReturn to 05_Projects_and_Portfolio.pdf for the capstone specification and evaluation rubric. A working\narchitecture should be explainable, monitored, secure by intent and recoverable from a controlled failure.",
    "sourcePdf": "03_Operations_and_Security.pdf",
    "activityId": "A24"
  }
] satisfies ModuleDefinition[];

export const moduleDefinitions = moduleDefinitionsSchema.parse(definitions);
