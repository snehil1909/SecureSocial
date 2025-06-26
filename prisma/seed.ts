import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Add the default admin user with specified credentials
  // Create default admin user with specified credentials
  const adminPassword = await hash("@7PastApril", 12)
  const admin = await prisma.user.upsert({
    where: { email: "adminpast@gmail.com" },
    update: {
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      name: "Admin User",
      email: "adminpast@gmail.com",
      phone: "+1234567890",
      password: adminPassword,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: new Date(),
      phoneVerified: new Date(),
    },
  })

  console.log("Default admin created:", admin.email)

   
  // Create categories
  const categories = [
    "Electronics",
    "Clothing",
    "Home & Garden",
    "Sports",
    "Toys & Games",
    "Books",
    "Automotive",
    "Health & Beauty",
  ]

  for (const categoryName of categories) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {},
      create: {
        name: categoryName,
      },
    })
  }

  console.log("Seed data created successfully")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

