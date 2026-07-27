const db = require("./database/db");
async function check() {
  try {
    const res = await db.query("SELECT id, conversation_id, file_name, length(file_content) as len FROM conversation_files");
    console.log("Uploaded files metadata:", res.rows);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
check();
