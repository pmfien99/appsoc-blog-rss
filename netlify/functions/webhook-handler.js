const fs = require('fs');
const path = require('path'); 
const { parse, j2xParser } = require('fast-xml-parser');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); 

const siteId = process.env.WEBFLOW_SITE_ID;
const accessToken = process.env.WEBFLOW_API_ACCESS_TOKEN;
const collectionID = process.env.POST_COLLECTION_ID;

exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const { triggerType, payload } = body;

  console.log("Webhook received from Webflow:", body);

  // Check if the webhook is for the correct collection ID
  if (payload.collectionId === collectionID) {
    if (triggerType === "collection_item_created") {
      console.log("New blog created");
    } else if (triggerType === "collection_item_changed") {
      console.log("Blog updated");
    } else if (triggerType === "collection_item_deleted") {
      console.log("Blog deleted");
    }
  } else {
    console.log("This is NOT an update to the blog collection");
  }

  const rssFilePath = 'rss.xml';

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Webhook received successfully!" }),
  };
};
