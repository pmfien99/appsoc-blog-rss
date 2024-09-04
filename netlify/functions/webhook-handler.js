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

  // Make this function asynchronous
  const getCollectionItem = async (id) => {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`
      }
    };

    try {
      const response = await fetch(`https://api.webflow.com/beta/collections/${collectionID}/items/${id}`, options);
      const data = await response.json();
      return data; 
    } catch (err) {
      console.error('Error fetching collection item:', err);
      throw err; 
    }
  };

  // Check if the webhook is for the correct collection ID
  if (payload.collectionId === collectionID) {
    if (triggerType === "collection_item_created") {
      console.log("New blog created");

      // Ensure the post is not archived or draft
      if (!payload.isArchived && !payload.isDraft) {
        try {
          const postData = await getCollectionItem(payload.id);  
          console.log(postData); 
        } catch (error) {
          console.error("Error processing collection item:", error);
        }
      }

    } else if (triggerType === "collection_item_changed") {
      console.log("Blog updated");

      if (!payload.isArchived && !payload.isDraft) {
        try {
          const postData = await getCollectionItem(payload.id); 
          console.log(postData);
        } catch (error) {
          console.error("Error processing collection item:", error);
        }
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
