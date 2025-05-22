const fs = require("fs");
const path = require("path");

console.log("Starting to read the file...");
const readable = fs.createReadStream(path.join(__dirname, "gemini_test_output.json"));
readable.setEncoding("utf8");

readable.on("end", () => {
  console.log("END OF STREAM");;
  readable.close();
});
readable.on("data", (data) => {
  console.log("READING DATA");
  const firstBracketIndex = data.indexOf("{");
  const lastBracketIndex = data.lastIndexOf("}\n```");
  const cleanData = JSON.parse(data.slice(firstBracketIndex, lastBracketIndex+1));
  console.log(cleanData?.ingredients);
});
