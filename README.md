# 毛泽东选集

个人使用的安卓离线阅读器：收录四卷 159 篇文章，按书籍目录阅读，支持阅读进度、书签和选中文字笔记。

## 使用

从 [GitHub Releases](https://github.com/zsaaaasz/maozedong-selected-works-reader/releases/latest) 下载最新版 APK 并安装到安卓手机。阅读进度、书签和笔记保存在 App 本地存储中，不提供账号或云同步；卸载 App 会删除这些数据。此构建不申请网络权限。

在文章里长按选择任意文字后点“记笔记”；“笔记”页可以检索、编辑已保存的笔记并跳回摘录位置。文章角标可跳转到文末对应注释。

## 本地构建

需要 Node.js、pnpm、JDK 21 和 Android SDK 36：

```powershell
pnpm install --frozen-lockfile
.\build-apk.ps1
```

脚本读取 `JAVA_HOME`、`ANDROID_SDK_ROOT`（或 `ANDROID_HOME`）中的本地工具链；在 Codex 工作区中也会自动使用附带的便携 JDK/SDK。APK 输出到项目根目录。这是用于侧载安装的 debug 签名版本。

## 项目说明

阅读器基于 [MaoBible](https://github.com/frankfika/MaoBible) 的 React + Capacitor 项目修改。四卷文章文本随 App 打包，可离线阅读；阅读进度、书签和笔记保存在设备本地。

## 许可

软件代码遵循根目录的 MIT License。文章正文和图像素材不由该软件许可证自动授权；请先阅读 `LICENSE` 中的内容版权说明。
