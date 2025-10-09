# 刷新Java项目依赖脚本 - 解决Trae开发工具中Lombok和Jar包报红问题

Write-Host "=== 开始刷新Java项目依赖 ===" -ForegroundColor Green

# 定义项目路径
$projectPath = "d:\登链社区\denglian\day12\erc20-indexer"

# 进入项目目录
Set-Location -Path $projectPath

# 创建必要的目录
if (-Not (Test-Path -Path "$projectPath\.mvn")) {
    New-Item -Path "$projectPath\.mvn" -ItemType Directory
    Write-Host "创建 .mvn 目录"
}

# 创建mvn wrapper配置
$wrapperConfig = @"
wrapperUrl=https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar
wrapperVersion=3.2.0
"@
Set-Content -Path "$projectPath\.mvn\wrapper\maven-wrapper.properties" -Value $wrapperConfig
Write-Host "配置 Maven Wrapper"

# 清理VS Code Java缓存
$vscodeCache = "$env:APPDATA\Code\User\workspaceStorage"
if (Test-Path -Path $vscodeCache) {
    Write-Host "清理VS Code Java语言服务器缓存..."
    Get-ChildItem -Path $vscodeCache -Recurse -Directory | Where-Object {$_.Name -like "*jdt*"} | ForEach-Object {
        Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 清理项目target目录
if (Test-Path -Path "$projectPath\target") {
    Write-Host "清理项目target目录..."
    Remove-Item -Path "$projectPath\target" -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -Path "$projectPath\target" -ItemType Directory
}

# 输出操作指南
Write-Host "`n=== 操作指南 ===" -ForegroundColor Yellow
Write-Host "1. 关闭并重新打开Trae开发工具"
Write-Host "2. 在Trae中，按下 Ctrl+Shift+P 并执行 'Java: Clean Java Language Server Workspace'"
Write-Host "3. 等待Java语言服务器重新加载项目"
Write-Host "4. 检查项目中的Lombok注解和Jar包引用是否仍然报红"
Write-Host "`n如果问题仍然存在，可以尝试："
Write-Host "- 确认已安装最新版本的Java Extension Pack扩展"
Write-Host "- 确认JDK版本为11或更高版本"
Write-Host "- 执行 'Java: Force Java compilation' 命令强制编译项目"

Write-Host "`n=== 刷新完成 ===" -ForegroundColor Green