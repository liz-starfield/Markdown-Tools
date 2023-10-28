import puppeteer from 'puppeteer';
import fs from 'fs';
import JSONStream from 'JSONStream';
import { Readable } from 'stream';
import { exit } from 'process';
import path from 'path';
import { win32 } from "node:path";

// 以下四个参数必须更改
process.env.USER="your yuque user" // USER：账号密码方式登陆的用户名
process.env.PASSWORD="your yuque password" // PASSWORD：账号密码方式登陆的密码
process.env.ACCESSURL = "your yuque accessurl" // ACCESSURL：个人路径`https://www.yuque.com/xxx`中的xxx，可通过https://www.yuque.com/settings/account查看
process.env.BROWSER_EXECUTE_PATH="your browser execute path" // BROWSER_EXECUTE_PATH：谷歌的chrome.exe路径，例如C:/Program Files (x86)/Google/Chrome/Application/chrome.exe
// 该参数不必更改，可按需更改
process.env.EXPORT_PATH="export" // 默认导出到当前文件夹下的export文件夹中，可以进行按需替换

class BookPage {
  constructor(id, name, slug) {
    this.id = id;
    this.name = name;
    this.slug = slug
  }
}

class Book {
  pages
  pageLength
  constructor(id, name, slug) {
    this.id = id;
    this.name = name;
    this.slug = slug
  }
}

if (!process.env.ACCESSURL) {
  console.log('env var: ACCESSURL required')
  process.exit(1);
}


if (!process.env.EXPORT_PATH) {
  console.log('env var: EXPORT_PATH required')
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch({ headless: false, executablePath: process.env.BROWSER_EXECUTE_PATH }); // true:not show browser
  const page = await browser.newPage();
  
  console.log("Login use user + password...")
  if (!process.env.USER) {
    console.log('USER required')
    process.exit(1);
  }
  
  if (!process.env.PASSWORD) {
    console.log('PASSWORD required')
    process.exit(1);
  }

  await page.goto('https://www.yuque.com/login');
  // Switch to password login
  await page.click('.switch-btn');

  // Fill in phone number and password
  await page.type('input[data-testid=prefix-phone-input]', process.env.USER);
  await page.type('input[data-testid=loginPasswordInput]', process.env.PASSWORD);

  // Check agreement checkbox
  await page.click('input[data-testid=protocolCheckBox]');

  // Click login button
  await page.click('button[data-testid=btnLogin]');

  // 等待页面跳转完成
  await page.waitForNavigation();
  
  console.log("Login successfully!")
  console.log()


  console.log("Get book stacks ...")
  var books = [];
  const response = await page.goto('https://www.yuque.com/api/mine/book_stacks', { waitUntil: 'networkidle0' });
  const bookListData = await response.text();
  
  const stream = new Readable({
    read() {
      this.push(bookListData);
      this.push(null); // stream end
    }
  });
  const parser = JSONStream.parse('data.*');
  stream.pipe(parser);
  parser.on('data', function(object) {
    for ( let i = 0; i < object.books.length; i++ ) {
      books.push(new Book(object.books[i].id, object.books[i].name, object.books[i].slug))
    }
  });


  await new Promise(resolve => {
    parser.on('end', async () => {
      console.log(`Books count is: ${books.length}`)
      var bookPages = [];
      for ( let i = 0; i < books.length; i++ ) {
        bookPages[i] = [];
        var bookUrl = 'https://www.yuque.com/api/docs?book_id=' + books[i].id
        var bookResponse = await page.goto(bookUrl, { waitUntil: 'networkidle0' });
        var pageListData = await bookResponse.text();
        var bookStream = new Readable({
          read() {
            this.push(pageListData);
            this.push(null); // stream end
          }
        });
        var bookParser = JSONStream.parse('data.*');
        bookStream.pipe(bookParser);
        bookParser.on('data', (object) => {
          bookPages[i].push(new BookPage(object.id, object.title, object.slug))
        });

        bookParser.on('end', () => {
          console.log(`No.${i+1} Book's name: ${books[i].name}`)
          console.log(bookPages[i])
          console.log()
          books[i].pages = bookPages[i]
          books[i].pageLength = bookPages[i].length
          
          if (i === books.length - 1) {
            resolve();
          }
        });
      }
    });
  }).then(async () => {
    console.log()
    console.log("Start export all books ...")
    console.log()

    const folderPath = process.env.EXPORT_PATH;
    console.log("download folderPath: " + folderPath)
    if (!fs.existsSync(folderPath)) {
      console.error(`export path:${folderPath} is not exist`)
      process.exit(1)
    }

    const client = await page.target().createCDPSession();
    const options = { output: folderPath };
    await client.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: win32.resolve(win32.normalize(options.output))      
    });

    for ( let i = 0; i < books.length; i++ ) {
      for (let j = 0; j < books[i].pages.length; j++ ) {
        await downloadMardown(page, folderPath, books[i].name, books[i].pages[j].name.replace(/\//g, '_') , process.env.ACCESSURL + "/" + books[i].slug + "/" + books[i].pages[j].slug)
        console.log();
      }
    }


    fs.readdir(folderPath, (err, files) => {
      if (err) throw err;

      files.forEach((file) => {
        const filePath = path.join(folderPath, file);
        fs.stat(filePath, (err, stat) => {
          if (err) throw err;

          if (stat.isFile()) {    
            fs.unlink(filePath, (err) => {
              if (err) throw err;
            });
          }
        });
      });
      
    console.log()
    console.log(`Export successfully!!!`);
    console.log()
    });
  });

  browser.close()
})();


async function downloadMardown(page, rootPath, book, mdname, docUrl) {
  const url = 'https://www.yuque.com/' + docUrl + '/markdown?attachment=true&latexcode=true&anchor=false&linebreak=false';
  const timeout = 30000;

  const newPath = path.join(rootPath, book);
  if (!fs.existsSync(newPath)) {
    fs.mkdirSync(newPath)
  }

  async function goto(page, link) {
    return page.evaluate((link) => {
        location.href = link;
    }, link);
  }
  await goto(page, url);



  async function downloadFile(mdname, recount = 0) {
    var count = recount
    try {      
      const fileNameWithExt = await waitForDownload(mdname);
      const oldFiles = path.join(rootPath, fileNameWithExt);
      const fileName = path.basename((fileNameWithExt), path.extname(fileNameWithExt));
      console.log("Download document " + book + "/" + fileName + " finished")
      var newFiles = path.join(newPath, fileName.replace(/\//g, '_') + '.md');
      while (fs.existsSync(newFiles)) {
        count++;
        newFiles = path.join(newPath, fileName.replace(/\//g, '_') + `(${count}).md`);
      }

      fs.renameSync(oldFiles, newFiles);
      console.log('Moved file to:', newFiles);
    } catch (error) {
      console.log(error);      
      const logMessage = `${new Date().toISOString()}: ${error}\n`;
      fs.appendFile('error.log', logMessage, (err) => {
      if (err) {
        console.error('无法记录错误日志', err);
      }});        
    }
  }

  async function waitForDownload(mdname, started = false) {
    return new Promise((resolve, reject) => {
      const watcher = fs.watch(rootPath, (eventType, filename) => {
        if (eventType === 'rename' && filename === `${mdname}.md.crdownload` && !started) {
          console.log("Downloading document " + book + "/" + mdname)
          started = true
        }

        if (eventType === 'rename' && filename === `${mdname}.md` && started) {
          watcher.close();
          resolve(filename);
        }
      });

      setTimeout(() => {
        watcher.close();
        reject(new Error('Download timed out:' + book + "/" + mdname));
      }, timeout);
    });
  }

  await downloadFile(mdname)
}


