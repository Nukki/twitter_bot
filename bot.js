let chalk = require('chalk');   // make terminal pretty
let https = require('https');   // for gif download
let fs = require('fs');         // for gif download

// twitter setup
let Twit = require('twit');
// let config = require('./config');
let config = {
  consumer_key: process.env.twitter_consumer_key ,
  consumer_secret: process.env.twitter_consumer_secret ,
  access_token: process.env.twitter_access_token ,
  access_token_secret: process.env.twitter_access_token_secret ,
  timeout_ms: 70*1000,
}
let T = new Twit(config);

// giphy setup
// let giphy_key = require('./giphy_key');
let giphy_key = process.env.giphy_api_key;
let giphy = require('giphy-api')(giphy_key);

 // var stream = T.stream('user');
 // stream.on('follow', function(msg) {
 //   console.log("followed by ", msg.source.screen_name);
 // });

// post updates about my day
// 1 min = 1000*60
setInterval(() => {
  let search = pickUpdateTerm();
  postWithGif(search, "", null);
}, 1000*60*60);

// educate people who use the term "crypto" incorrectly
 let stream = T.stream('statuses/filter', { track: '#crypto' })
 stream.on('tweet', function (tweet) {
   // if the tweet author has a lot of followers, go educate
   if(tweet.user.followers_count > 100000) {
     console.log(chalk.red(`TIME TO EDUCATE @${tweet.user.screen_name}`))
     let part_text = pickTweetText();
     let full_text = `@${tweet.user.screen_name} ${part_text}`;
     let search = pickSearchTerm();
     postWithGif(search, full_text, tweet.id_str);
   }
 })



// ************************* Posting Functionality *******************


// gif_search_term is given to Giphy API
// tweet_text is the content of posted
// reply_id is the tweet id we're replying to, null if a tweet is not a reply
function postWithGif(gif_search_term, tweet_text, reply_id) {
  console.log(chalk.magentaBright("CREATING A TWEET **************************"));

  // find a good gif
  giphy.search(gif_search_term, function (err, res) {
      console.log(chalk.greenBright("Getting a gif "));

      //pick which gif to download out of 25
      let gifNum = Math.floor(Math.random() * 24);

      // get the link from where to download a gif
      let gif_url = res.data[gifNum].images.downsized.url;

      // going to save the gif in current directory
      // setup filename and write stream
      let gif_id = res.data[gifNum].id;
      let file_path = `${gif_id}.gif`;
      let ws = fs.createWriteStream(file_path);

      // go get gif from the internet
      let request = https.get(gif_url, (response) => {
         response.pipe(ws); // save the write stream to file

         // done dowloading the gif
         ws.on('close', function() {
           console.log(chalk.greenBright("Saved gif in ", file_path));

           // from 'Twit' documentation --> how to upload media
           let b64content = fs.readFileSync(file_path, { encoding: 'base64' });
           T.post('media/upload', { media_data: b64content }, (err, data, response) => {
             if(err) {
               console.log(chalk.red(err))
             }
             else {
               let mediaIdStr = data.media_id_string
               console.log(chalk.blueBright(`Got media id ${mediaIdStr}`));

               let altText = "Small flowers in a planter on a sunny balcony, blossoming."
               let meta_params = { media_id: mediaIdStr, video: { "video_type": "video/mp4"}, alt_text: { text: altText } }

               T.post('media/metadata/create', meta_params, (err, data, response) => {
                 if (!err) {
                   console.log(chalk.yellow("Created metadata"));

                   // make different params depending on whether it's a reply or not
                   let params = {};
                   if (reply_id) {
                     params = { status: tweet_text, media_ids: [mediaIdStr], in_reply_to_status_id: reply_id }
                   }
                   else {
                     params = { status: tweet_text, media_ids: [mediaIdStr] }
                   }

                   // post a tweet with media
                   T.post('statuses/update', params, (err, data, resp) => {
                     if (!err) {
                       console.log(chalk.gray("Tweet posted"));

                       //delete a gif from server since we're done sending it
                       fs.unlink(file_path, (err) => {
                         if (!err) {
                           console.log(chalk.magentaBright("DONE **************************"));
                         }
                       });

                     }
                     else {
                       console.log(chalk.red(err))
                     }
                   })
                 } // end if not err
               }) // end create metadata
             } // end else ( when got the media string )
           }) // end media chunked call
        }); // end on finish ws
       }); // end get request
  }); // end giphy
} // end post with gif


// returns random search term for educational reaction
function pickSearchTerm() {
  let options = ["stop", "mad", "angry", "annoyed", "cut it" ];
  return options[Math.floor(Math.random() * 4)];
}

// returns random educational text
function pickTweetText() {
  let options = [
    "Actually... Crypto stands for CRYPTOGRAPHY!",
    "Hey, just a reminder, hashtag CRYPTO means cryptography 🤓",
    "crypto => C.R.Y.P.T.O.G.R.A.P.H.Y not cryptocurrency! 🤨",
    "Will you stop using hashtag *crypto* ... it's CRYPTOGRAPHY, not cryptocurrency #goStudy",
    "Please stop using the word *crypto* incorrectly. It stands for CRYPTOGRAPHY, not cryptocurrency 🤨",
    "Kind correction: crypto stands for cryptography, NOT cryptocurrency ;)"
  ];
  return options[Math.floor(Math.random() * 5)];
}

// returns random term for my twitter updates
function pickUpdateTerm() {
  let options = [ "i need sleep", "i'm hungry", "code"];
  return options[Math.floor(Math.random() * 2)];
}
