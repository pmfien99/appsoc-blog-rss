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

  const getCollectionItem = (id) => {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`
      }
    };

    fetch(`https://api.webflow.com/beta/collections/${collectionID}/items/${id}`, options)
    .then(response => response.json())
    .then(response => console.log(response))
    .catch(err => console.error(err));
  }

  // Check if the webhook is for the correct collection ID
  if (payload.collectionId === collectionID) {
    if (triggerType === "collection_item_created") {
      
      console.log("New blog created");
      if (payload.isArchived != false && payload.isDraft != false) {
        const postData = getCollectionItem(payload.id);
        console.log(postData);
      }

    } else if (triggerType === "collection_item_changed") {

      console.log("blog updated");
      if (payload.isArchived != false && payload.isDraft != false) {
        const postData = getCollectionItem(payload.id);
        console.log(postData);
      }

    } else if (triggerType === "collection_item_deleted") {
      console.log("Blog deleted");
    }
  } else {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Non Blog Post webhook received successfully!" }),
    };
  }

  const rssFilePath = 'rss.xml';

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Webhook received successfully!" }),
  };
};
