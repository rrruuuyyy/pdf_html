// let throng = require('throng');
let Queue = require("bull");
const puppeteer = require('puppeteer');

// Connect to a local redis intance locally, and the Heroku-provided URL in production
let REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Spin up multiple processes to handle jobs to take advantage of more CPU cores
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
let workers = process.env.WEB_CONCURRENCY || 2;

// The maxium number of jobs each worker should process at once. This will need
// to be tuned for your application. If each job is mostly waiting on network 
// responses it can be much higher. If each job is CPU-intensive, it might need
// to be much lower.
let maxJobsPerWorker = 20;


async function start() {
    console.log('Start whit Bull')
    // Connect to the named work queue
    let workQueue = new Queue('html_pdf', REDIS_URL);

  workQueue.process(maxJobsPerWorker,async (job) => {
    console.log('Estamos dentro del puppeter loco')
    var html = job;
    console.log(html);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html);
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
    return Promise.resolve(buffer)
    // res.end(buffer); 
  });
}

// Initialize the clustered worker process
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
module.exports.start = start();