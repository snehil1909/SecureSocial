import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const categories = await db.category.findMany({
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Get categories error:", error)
    return NextResponse.json({ message: "An error occurred while fetching categories" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
    })

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ message: "Category name is required" }, { status: 400 })
    }

    // Check if category already exists
    const existingCategory = await db.category.findUnique({
      where: {
        name,
      },
    })

    if (existingCategory) {
      return NextResponse.json({ message: "Category already exists" }, { status: 409 })
    }

    // Create category
    const category = await db.category.create({
      data: {
        name,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error("Create category error:", error)
    return NextResponse.json({ message: "An error occurred while creating the category" }, { status: 500 })
  }
}

