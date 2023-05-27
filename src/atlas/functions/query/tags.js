exports = function({query, headers, body}, response) {
    let {tags, before} = query;
    
    if(!tags || tags.length === 0) {
      return {};
    }
    
    tags = tags.split(",").map((t)=>t.trim().toLowerCase());
    if(!before || !/^\d+$/.test(before)) before = Date.now();
    else before = Number(before);

    const docs = context.services.get("mongodb-atlas").db("scrapbook").collection("files")
    .find({ tags: { $all: tags }, create_timestamp: { $lte: before } })
    .sort({ create_timestamp: -1 })
    .limit(50)
    .toArray();
    
    return docs;
};
