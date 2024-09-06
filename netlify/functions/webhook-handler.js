const fs = require('fs');
const path = require('path'); 
const { parse, j2xParser } = require('fast-xml-parser');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); 

const siteId = process.env.WEBFLOW_SITE_ID;
const accessToken = process.env.WEBFLOW_API_ACCESS_TOKEN;
const collectionID = process.env.POST_COLLECTION_ID;

const rssFilePath = path.resolve(__dirname, 'rss.xml');

// Function to fetch Webflow collection item
const getCollectionItem = async (id) => {
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`
    }
  };

  try {
    const response = await fetch(`https://api.webflow.com/collections/${collectionID}/items/${id}`, options);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error fetching collection item:', err);
    throw err;
  }
};

// Function to read the existing RSS file
const readRSSFile = () => {
  if (fs.existsSync(rssFilePath)) {
    console.log("Rss file exists, reading file...");
    try {
      const rssData = fs.readFileSync(rssFilePath, 'utf8');
      console.log("RSS file read successfully");
      return parse(rssData, { ignoreAttributes: false });
    } catch (err) {
      console.error("Error reading RSS file:", err);
    }
  } else {
    console.log("RSS file does not exist, creating new structure...");
    return {
      rss: {
        "@_version": "2.0",
        "@_xmlns:atom": "http://www.w3.org/2005/Atom",
        channel: {
          title: "AppSOC Security Blog",
          link: "https://www.appsoc.com",
          description: "The AppSOC Security Blog provides a range of expert insights on pressing security topics.",
          item: []
        }
      }
    };
  }
};

// Function to write the updated RSS data to the file
const writeRSSFile = (rssData) => {
  console.log("Attempting to write to rss.xml file...");
  try {
    const builder = new j2xParser({ ignoreAttributes: false, format: true });
    const xml = builder.parse(rssData);
    fs.writeFileSync(rssFilePath, xml, 'utf8');
    console.log("RSS file updated successfully");
  } catch (err) {
    console.error("Error writing to RSS file:", err);
  }
};

const updateRSSFeed = (rssData, postData) => {
  const postID = postData.id
  const postBody = postData.fieldData.post-body
  const postTitle = postData.fieldData.slug
  const postLink = `https://www.appsoc.com/blog/${postData.fieldData.slug}`;
  const postDescription = postData.fieldData.post-excerpt
  const postDate = new Date(postData.fieldData.post---posted-date).toUTCString();
  const postImageUrl = postData.fieldData.post-main-image.url;

  const rssItem = {
    title: postTitle,
    link: postLink,
    guid: postID,
    description: postDescription,
    pubDate: postDate,
    "media:content": {
      "@_url": postImageUrl,
      "@_medium": "image"
    },
    "media:thumbnail": {
      "@_url": postImageUrl
    },
    "content:encoded": `<![CDATA[${postBody}]]>`
  };

  const existingItemIndex = rssData.rss.channel.item.findIndex(item => item.guid === postLink);

  if (existingItemIndex !== -1) {
    rssData.rss.channel.item[existingItemIndex] = rssItem;
  } else {
    rssData.rss.channel.item.push(rssItem);
  }

  rssData.rss.channel.item.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  writeRSSFile(rssData);
};

// Function to delete a blog post from the RSS feed
const deleteRSSFeedItem = (rssData, postId) => {
  const postLink = `https://www.appsoc.com/blog/${postId}`;

  const itemIndex = rssData.rss.channel.item.findIndex(item => item.guid === postLink);

  if (itemIndex !== -1) {
    rssData.rss.channel.item.splice(itemIndex, 1);
    console.log(`Post with ID ${postId} removed from RSS feed`);
  } else {
    console.log(`Post with ID ${postId} not found in RSS feed`);
  }

  writeRSSFile(rssData);
};


// Main handler for the webhook
exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const { triggerType, payload } = body;

  const rssData = readRSSFile();

  if (payload.collectionId === collectionID) {
    if (triggerType === "collection_item_created" || triggerType === "collection_item_changed") {
      console.log("Blog created or updated");

      if (!payload.isArchived && !payload.isDraft) {
        try {
          const postData = await getCollectionItem(payload.id); 
          updateRSSFeed(rssData, postData); 
        } catch (error) {
          console.error("Error processing collection item:", error);
        }
      }
    } else if (triggerType === "collection_item_deleted") {
      console.log("Blog deleted");
      deleteRSSFeedItem(rssData, payload.slug);
    }
  } else {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Non-blog post webhook received successfully!" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Webhook received successfully!" }),
  };
};
