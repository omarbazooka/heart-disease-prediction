const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "src/../.env") });

const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Reset passwords for all 6 fixture users
    const usersToReset = [
      { username: "youssef amr",    newPassword: "youssef123" },
      { username: "omar ahmed",     newPassword: "omar1234"   },
      { username: "george anwer",   newPassword: "george1234" },
      { username: "ranim mohamed",  newPassword: "ranim1234"  },
      { username: "samar hamza",    newPassword: "samar1234"  },
      { username: "aya hassan",     newPassword: "aya1234"    },
    ];

    for (const { username, newPassword } of usersToReset) {
      const user = await prisma.user.findFirst({
        where: { username: { equals: username, mode: "insensitive" } },
      });

      if (!user) {
        console.log(`⚠️  User "${username}" not found, skipping...`);
        continue;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      console.log(`✅ Password reset for: "${username}" -> "${newPassword}"`);
    }

    console.log("\n🎉 Done! All passwords have been reset.");
    console.log("You can now login with:");
    console.log("  Username: youssef amr  |  Password: youssef123");

  } catch (e) {
    console.error("❌ Error:", e.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
