#!/usr/bin/env python3
"""
仓库管理系统 - 图形化启动器
使用 Python Tkinter 实现，轻量兼容，不需要额外依赖
"""

import tkinter as tk
from tkinter import ttk, scrolledtext
import subprocess
import threading
import os
import sys
import time
from urllib.parse import quote

class WarehouseGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("🏭 仓库管理系统")
        self.root.geometry("800x600")
        self.root.minsize(600, 400)

        # 进程句柄
        self.backend_process = None
        self.frontend_process = None

        # 创建UI
        self.create_widgets()

        # 初始检查状态
        self.check_status()

    def create_widgets(self):
        # 标题
        title_label = tk.Label(self.root, text="🏭 仓库管理系统", font=("Arial", 20, "bold"))
        title_label.pack(pady=10)

        # 状态栏
        status_frame = tk.Frame(self.root)
        status_frame.pack(fill=tk.X, padx=20, pady=5)

        # 后端状态
        self.backend_status_var = tk.StringVar(value="检查中...")
        self.backend_color_var = tk.StringVar(value="#ef4444")
        backend_label = tk.Label(status_frame, text="后端服务:")
        backend_label.grid(row=0, column=0, padx=5, pady=5)
        self.backend_indicator = tk.Label(status_frame, textvariable=self.backend_status_var,
                                         bg=self.backend_color_var.get(), fg="white",
                                         width=10, relief=tk.RAISED)
        self.backend_indicator.grid(row=0, column=1, padx=5, pady=5)

        # 前端状态
        self.frontend_status_var = tk.StringVar(value="检查中...")
        self.frontend_color_var = tk.StringVar(value="#ef4444")
        frontend_label = tk.Label(status_frame, text="前端服务:")
        frontend_label.grid(row=0, column=2, padx=20, pady=5)
        self.frontend_indicator = tk.Label(status_frame, textvariable=self.frontend_status_var,
                                          bg=self.frontend_color_var.get(), fg="white",
                                          width=10, relief=tk.RAISED)
        self.frontend_indicator.grid(row=0, column=3, padx=5, pady=5)

        status_frame.grid_columnconfigure(1, weight=1)
        status_frame.grid_columnconfigure(3, weight=1)

        # 按钮区域
        button_frame = tk.Frame(self.root)
        button_frame.pack(fill=tk.X, padx=20, pady=10)

        self.start_btn = tk.Button(button_frame, text="🚀 启动服务",
                                  command=self.start_services,
                                  font=("Arial", 14), bg="#10b981", fg="white",
                                  padx=20, pady=10)
        self.start_btn.pack(side=tk.LEFT, expand=True, padx=5)

        self.stop_btn = tk.Button(button_frame, text="🛑 停止服务",
                                 command=self.stop_services,
                                 font=("Arial", 14), bg="#ef4444", fg="white",
                                 padx=20, pady=10)
        self.stop_btn.pack(side=tk.LEFT, expand=True, padx=5)

        self.reset_btn = tk.Button(button_frame, text="🔐 重置密码",
                                  command=self.reset_password,
                                  font=("Arial", 14), bg="#f59e0b", fg="white",
                                  padx=20, pady=10)
        self.reset_btn.pack(side=tk.LEFT, expand=True, padx=5)

        # 日志区域
        log_frame = tk.Frame(self.root)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        log_label = tk.Label(log_frame, text="📝 运行日志")
        log_label.pack(anchor=tk.W)

        self.log_text = scrolledtext.ScrolledText(log_frame, wrap=tk.WORD,
                                                font=("Courier", 10))
        self.log_text.pack(fill=tk.BOTH, expand=True)

        # 清空日志按钮
        clear_btn = tk.Button(log_frame, text="清空日志", command=self.clear_log)
        clear_btn.pack(anchor=tk.E, pady=5)

        # 页脚
        footer_label = tk.Label(self.root,
                               text="默认账号: admin / 123456",
                               fg="#6b7280")
        footer_label.pack(pady=5)

    def log(self, message):
        """添加日志"""
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.root.update()

    def clear_log(self):
        """清空日志"""
        self.log_text.delete(1.0, tk.END)

    def update_status(self):
        """更新状态指示器"""
        # 更新后端状态
        if self.backend_process and self.backend_process.poll() is None:
            self.backend_status_var.set("运行中")
            self.backend_color_var.set("#10b981")
        else:
            self.backend_status_var.set("已停止")
            self.backend_color_var.set("#ef4444")

        # 更新前端状态
        if self.frontend_process and self.frontend_process.poll() is None:
            self.frontend_status_var.set("运行中")
            self.frontend_color_var.set("#10b981")
        else:
            self.frontend_status_var.set("已停止")
            self.frontend_color_var.set("#ef4444")

        self.backend_indicator.config(bg=self.backend_color_var.get())
        self.frontend_indicator.config(bg=self.frontend_color_var.get())

        # 更新按钮状态
        running = self.is_running()
        self.start_btn.config(state=tk.DISABLED if running else tk.NORMAL)
        self.stop_btn.config(state=tk.NORMAL if running else tk.DISABLED)

    def check_status(self):
        """检查端口是否被监听，更新状态"""
        self.update_status()
        self.root.after(3000, self.check_status)

    def is_running(self):
        """检查是否有服务在运行"""
        backend_running = self.backend_process and self.backend_process.poll() is None
        frontend_running = self.frontend_process and self.frontend_process.poll() is None
        return backend_running or frontend_running

    def get_project_root(self):
        """获取项目根目录"""
        return os.path.dirname(os.path.abspath(__file__))

    def start_services(self):
        """启动所有服务"""
        self.clear_log()
        self.log("🚀 正在启动仓库管理系统...\n")

        project_root = self.get_project_root()

        # 启动后端
        self.log("📦 启动后端服务...")
        os.chdir(os.path.join(project_root, "backend"))
        self.backend_process = subprocess.Popen(
            ["npm", "run", "dev"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        threading.Thread(target=self.stream_output,
                       args=(self.backend_process,), daemon=True).start()
        self.log(f"✅ 后端已启动，PID: {self.backend_process.pid}")

        # 等待后端启动
        time.sleep(2)

        # 启动前端
        self.log("\n🌐 启动前端服务...")
        os.chdir(os.path.join(project_root, "frontend"))
        self.frontend_process = subprocess.Popen(
            ["npm", "run", "dev"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        threading.Thread(target=self.stream_output,
                       args=(self.frontend_process,), daemon=True).start()
        self.log(f"✅ 前端已启动，PID: {self.frontend_process.pid}")

        self.update_status()

        # 等待前端就绪，然后打开浏览器
        threading.Thread(target=self.open_browser_when_ready, daemon=True).start()

    def stream_output(self, proc):
        """流式输出进程日志"""
        for line in proc.stdout:
            self.log(line.rstrip())

    def open_browser_when_ready(self):
        """等待前端就绪后打开浏览器"""
        # 等待几秒让前端启动
        time.sleep(5)

        # 尝试获取局域网 IP
        lan_ip = self.get_lan_ip()
        url = f"http://{lan_ip}:5173" if lan_ip else "http://localhost:5173"

        self.log(f"\n🌐 打开浏览器: {url}")

        # 跨平台打开浏览器
        try:
            import webbrowser
            webbrowser.open(url)
        except Exception as e:
            self.log(f"⚠️  自动打开浏览器失败，请手动访问: {url}")

    def get_lan_ip(self):
        """获取第一个非本地局域网 IP"""
        import socket
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            # 不需要真的连接
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            if not ip.startswith("127."):
                return ip
        except Exception:
            pass
        return None

    def stop_services(self):
        """停止所有服务"""
        self.log("\n🛑 正在停止所有服务...")

        # 停止后端
        if self.backend_process:
            try:
                self.log(f"停止后端 (PID: {self.backend_process.pid})...")
                self.backend_process.terminate()
                self.backend_process.wait()
                self.log("✅ 后端已停止")
            except Exception as e:
                self.log(f"⚠️  停止后端失败: {e}")
            self.backend_process = None

        # 停止前端
        if self.frontend_process:
            try:
                self.log(f"停止前端 (PID: {self.frontend_process.pid})...")
                self.frontend_process.terminate()
                self.frontend_process.wait()
                self.log("✅ 前端已停止")
            except Exception as e:
                self.log(f"⚠️  停止前端失败: {e}")
            self.frontend_process = None

        # 尝试杀掉所有子进程
        try:
            subprocess.run(["pkill", "-f", "node.*vite"], check=False)
            subprocess.run(["pkill", "-f", "node.*server.js"], check=False)
        except Exception:
            pass

        self.log("✅ 所有服务已停止")
        self.update_status()

    def reset_password(self):
        """重置管理员密码"""
        self.clear_log()
        self.log("🔐 正在重置管理员密码...\n")

        project_root = self.get_project_root()
        script_path = os.path.join(project_root, "backend", "reset-admin-password.js")

        try:
            result = subprocess.run(
                ["node", script_path],
                cwd=project_root,
                capture_output=True,
                text=True
            )
            self.log(result.stdout)
            if result.stderr:
                self.log(result.stderr)
            self.log("\n✅ 密码重置完成")
        except Exception as e:
            self.log(f"❌ 重置失败: {e}")

def main():
    """主函数"""
    # 检查 Python 版本
    if sys.version_info < (3, 6):
        print("错误: 需要 Python 3.6 或更高版本")
        sys.exit(1)

    # 检查 tkinter
    try:
        import tkinter
    except ImportError:
        print("错误: 找不到 tkinter，请安装:")
        print("  Ubuntu/Debian: sudo apt install python3-tk")
        print("  CentOS/RHEL: sudo yum install python3-tkinter")
        sys.exit(1)

    root = tk.Tk()
    app = WarehouseGUI(root)
    root.mainloop()

    # 退出时停止所有服务
    if app.is_running():
        app.stop_services()

if __name__ == "__main__":
    main()
