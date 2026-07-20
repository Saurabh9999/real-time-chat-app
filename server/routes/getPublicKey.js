import express from "express"

const router = express.Router()

router.get("/:userid/public-key", async(req, res) => {

    try{
    const { userid } = req.params;
    const user = await User.findById(userid).select("publicKey");

    if(!user) {
        return res.status(404).json({ error: "User not found" });
    }

      return res.json({
      publicKey: user.publicKey,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;