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

  let mockData = {
    id: '66d8bb6b99914e6f68a0c7df',
    siteId: '622134a6316eb7034f7dc84b',
    workspaceId: '62201bce1aac4e9ce1894c51',
    collectionId: '6467b87de9521f6d1945d190',
    lastPublished: null,
    lastUpdated: '2024-09-04T19:56:27.369Z',
    createdOn: '2024-09-04T19:56:27.369Z',
    isArchived: false,
    isDraft: false,
    fieldData: {
      'post---posted-date': '2024-09-04T00:00:00.000Z',
      'post-featured': false,
      'featured---homepage': false,
      'seo-meta-title': 'test',
      'seo-meta-description': 'test',
      name: 'test',
      'post-body': [Array],
      'post-excerpt': 'test',
      'post-main-image': [Object],
      slug: 'test',
      'post-author': '65f0b7bf6b45fa213c7d1a9e',
      categories: [Array]
    }
  }

  console.log("Webhook received from Webflow:", body);

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

  async 
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
