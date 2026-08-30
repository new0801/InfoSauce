import {
  getNewsByArea,
  getNewsByTopic,
  getNewsById,
} from "./newsFunction";

console.log("AREA TEST:");
console.log(getNewsByArea("AI & Technology"));

console.log("TOPIC TEST:");
console.log(getNewsByTopic("K-Pop"));

console.log("ID TEST:");
console.log(getNewsById("AI001"));