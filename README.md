# Markdown-Tools

- [工具一 ： 导出语雀知识库为markdown](#工具一--导出语雀知识库为markdown)
- [工具二 ：下载markdown文档中图片到本地](#工具二-下载markdown文档中图片到本地)
- [工具三 ： 去掉markdown文件名中的空格](#工具三--去掉markdown文件名中的空格)


## 工具一 ： 导出语雀知识库为markdown

### 特点

- 不需要token
- 批量导出一个账号下所有知识库
- 同一个知识库的文档都会放在以知识库命名的文件夹下，没有层次结构

### 使用步骤

#### Step1  

cd export-yuque-to-md

#### Step2

npm install 

#### Step3

更新index.js代码里以下四个参数为个人信息

- USER：账号密码方式登陆的用户名

- PASSWORD：账号密码方式登陆的密码

- ACCESSURL：个人路径`https://www.yuque.com/xxx`中的xxx，可通过https://www.yuque.com/settings/account查看

- BROWSER_EXECUTE_PATH：谷歌的chrome.exe路径，例如C:/Program Files (x86)/Google/Chrome/Application/chrome.exe

#### Step4

node index.js

#### Step5

查看结果并核对

- 日志结果为 `Export successfully!!!`
- 如果有error.log生成，查看语雀里对应文档为什么导出失败，可能该文档为思维导图或表格
- 在export文件夹下查看下载的markdown文档，与语雀里的文件个数进行核对



## 工具二 ：下载markdown文档中图片到本地

### 特点

- 各种图片类型都支持，如常用的png，jpg，jpeg，gif，webp
- 下载的图片命名与markdown文件名关联，如world.md中的图片命名为world-1.png，world-2.png，world-3.png
- 不会影响原文档，会生成新的文档

### 使用步骤

#### Step1  

找到download_images_in_md_to_local.ipynb

#### Step2

在代码中替换待处理和处理后的文件夹路径 origin_md_path 与 output_md_path 后，执行代码即可

Note：如执行代码报错为缺少某模块，请通过 "pip install 模块名"进行添加

## 工具三 ： 去掉markdown文件名中的空格

### 特点

- 去掉markdown文件名空格的同时，与该文件名相关的一切也一并会去掉空格。如：以markdown文件名命名的图片名，markdown里图片的引用地址，目录catalog.md里对markdown的引用
- 在原文档上更改，没有新文档生成，请按需备份
- 默认将空格替换为`_`，可以自行更改代码替换为空字符串或其他

### 使用步骤

#### Step1

找到remove_spaces_in_filename.ipynb

#### Step2

在代码中替换待处理的文件夹路径 folder_path 后，执行代码即可

