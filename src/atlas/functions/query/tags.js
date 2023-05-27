exports = function({query, headers, body}, response) {
    let {tags, before} = query;
    
    tags = tags.split(",").map((t)=>t.trim().toLowerCase());
    if(!before) before = Date.now();

    const docs = context.services.get("mongodb-atlas").db("scrapbook").collection("files")
    .find({ tags: { $all: tags }, create_timestamp: { $lte: before } })
    .sort({ create_timestamp: -1 })
    .limit(50)
    .toArray();
    
    return docs;
};
