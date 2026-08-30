import { NextResponse } from "next/server";
import {
  getNewsByArea,
  getNewsByTopic,
  getNewsById,
} from "@/data/newsFunction";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const area = searchParams.get("area");
  const topic = searchParams.get("topic");
  const id = searchParams.get("id");

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

  if (area) {
    return NextResponse.json(getNewsByArea(area));
  }

  if (topic) {
    return NextResponse.json(getNewsByTopic(topic));
  }

  return NextResponse.json({
    message: "Please provide area, topic, or id",
  });
}