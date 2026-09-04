import {
  getNewsByArea,
  getNewsByTopic,
  getNewsById,
  getFactCheckDetails,
} from "./index";

console.log("AREA TEST:");
console.log(getNewsByArea("AI & Technology"));

console.log("TOPIC TEST:");
console.log(getNewsByTopic("K-Pop"));

console.log("ID TEST:");
console.log(getNewsById("AI001"));

console.log("FACT CHECK TEST:");
const result = getFactCheckDetails("AI001");

console.log(JSON.stringify(result, null, 2));
