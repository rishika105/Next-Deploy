import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const registerOrLogin = async (req, res) => {
  try {
    const { uid, email, name } = req.user; // from Firebase decoded token

    let user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { firebaseUid: uid, email, name },
      });
    }

    res.json({ message: "Authenticated", user });
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
