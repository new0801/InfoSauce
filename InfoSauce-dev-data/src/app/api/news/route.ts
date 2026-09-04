import { NextResponse } from "next/server";
import {
  getNewsByArea,
  getNewsByTopic,
  getNewsById,
  getFactCheckDetails,
} from "@/data/newsFunction";

import { researchAll } from "@/data/researchAll";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const area = searchParams.get("area");
  const topic = searchParams.get("topic");
  const id = searchParams.get("id");
  const factCheck = searchParams.get("factCheck");
  const query = searchParams.get("query");

  // Get a specific news item
  if (id) {
    const result = getNewsById(id);

    if (!result) {
      return NextResponse.json(
        { error: "News not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  }

  // Get fact-check details
  if (factCheck) {
    const result = getFactCheckDetails(factCheck);

    if (!result) {
      return NextResponse.json(
        { error: "Fact check not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  }

  // Search real research sources
  if (query) {
    const result = await researchAll(query);

    return NextResponse.json(result);
  }

  // Search real research sources by area
  if (area) {
    const result = await researchAll(area);

    const areaResults = result.news.filter(
      (item) => item.area === area
    );

    return NextResponse.json({
      area,
      news: areaResults,
      unavailablePlatforms: result.unavailablePlatforms,
    });
  }

  // Get news by topic from static data
  if (topic) {
    return NextResponse.json(getNewsByTopic(topic));
  }

  return NextResponse.json({
    message: "Please provide area, topic, or id",
  });
}
