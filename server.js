const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require('puppeteer');
var cors = require('cors')
let Queue = require('bull');
fs = require('fs');
var download = require('download-pdf')

let REDIS_URL =  process.env.REDIS_URL || "redis://127.0.0.1:6379";

const app = express();
app.use(cors())

// const Bull = require('./process_bull/process');

//Seteo el nombre del proceso
// let workQueue = new Queue('html_pdf', REDIS_URL);
var videoQueue = new Queue('video transcoding', REDIS_URL);
videoQueue.process(800,async(job)=>{
  const name = Date.now();
  console.log(name)
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(job.data.doc);
  const buffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      left: "0px",
      top: "0px",
      right: "0px",
      bottom: "0px"
    }
  });
  await browser.close();
  // res.end(buffer);
  fs.writeFileSync(`./docs/${name}.pdf`, buffer, (err) => {
    console.log('Html mal formado')
  });
  return Promise.resolve({doc_name:name})
});
// parse requests of content-type - application/json
app.use(bodyParser.json());
app.use(bodyParser.text());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to html to pdf application." });
});
app.post("/html_pdf", async (req, res) => {
  req.accepts('text/plain');
  var html = `${req.body}`;
  // console.log(req.body);
  await videoQueue.add({doc:html});
  // videoQueue.add(req.body);
  await videoQueue.on('completed', async (job, result) => {
    var path = `docs/${result.doc_name}.pdf`;
    var file = await fs.readFileSync(path);
    // await fs.unlinkSync(path);
    res.setHeader('Content-Type', 'application/pdf');
    fs.unlink(path, (err) => {
      console.log(err)
    });
    res.end(file)
  })
  
  // res.status(200).json(respu);
  // let job = await workQueue.add(req.body);
  // var html = req.body;
  // console.log(req.body);
  // ( async() => { 
  //   const browser = await puppeteer.launch({ headless: true });
  //   const page = await browser.newPage();
  //   await page.setContent(html);
  //   const buffer = await page.pdf({
  //     format: "A4",
  //     printBackground: true,
  //     margin: {
  //       left: "0px",
  //       top: "0px",
  //       right: "0px",
  //       bottom: "0px"
  //     }
  //   });
  //   await browser.close();
  //   res.end(buffer);  
  //   })();
});

// async function printPDF() {
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();
//   await page.goto('https://google.com', {waitUntil: 'networkidle0'});
//   const pdf = await page.pdf({ format: 'A4' });
 
//   await browser.close();
//   return pdf
// })

require("./app/routes/customer.routes.js")(app);

// set port, listen for requests
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
