const express = require("express");
const cors = require("cors");
const path = require("path");

require("./database");

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the project root
app.use(express.static(path.join(__dirname, "..")));

/* ========== ROUTES ========== */
app.use("/patients", require("./routes/patients"));
app.use("/staff", require("./routes/staff"));
app.use("/appointments", require("./routes/appointments"));
app.use("/prescriptions", require("./routes/prescriptions"));
app.use("/invoices", require("./routes/invoices"));
app.use("/inventory", require("./routes/inventory"));
app.use("/users", require("./routes/users"));
app.use("/dental-charts", require("./routes/dentalCharts"));
app.use("/encounters", require("./routes/encounters"));
app.use("/procedures", require("./routes/procedures"));
app.use("/treatments", require("./routes/treatments"));
app.use("/followups", require("./routes/followups"));
app.use("/reports", require("./routes/reports"));
app.use("/settings", require("./routes/settings"));
app.use("/system-settings", require("./routes/systemSettings"));
app.use("/calendar-settings", require("./routes/calendarSettings"));
app.use("/cities", require("./routes/cities"));

/* ========== SEED CITIES ========== */
const City = require("./models/City");
async function seedCities() {
    try {
        const count = await City.countDocuments();
        if (count === 0) {
            console.log("Seeding cities database...");
            const punjab = ["Attock", "Fateh Jang", "Hasan Abdal", "Jand", "Pindi Gheb", "Kamra", "Bahawalnagar", "Chishtian", "Haroonabad", "Minchinabad", "Bahawalpur", "Ahmadpur East", "Hasilpur", "Khairpur Tamewali", "Bhakkar", "Darya Khan", "Kalur Kot", "Mankera", "Chakwal", "Choa Saidan Shah", "Kallar Kahar", "Lawa", "Talagang", "Chiniot", "Bhowana", "Lalian", "D.G. Khan", "Taunsa", "Kot Addu", "Koh-e-Suleman", "Faisalabad", "Jaranwala", "Samundri", "Tandlianwala", "Gojra", "Gujranwala", "Wazirabad", "Hafizabad", "Qila Didar Singh", "Gujrat", "Kharian", "Jalalpur Jattan", "Lalamusa", "Pindi Bhattian", "Jhang", "Ahmedpur Sial", "Shorkot", "Athara Hazari", "Jhelum", "Pind Dadan Khan", "Sohawa", "Dina", "Kasur", "Pattoki", "Kot Radha Kishan", "Khanewal", "Kabirwala", "Mian Channu", "Khushab", "Naushera", "Quaidabad", "Lahore", "Raiwind", "Shalimar", "Model Town", "Layyah", "Karor Lal Esan", "Chaubara", "Lodhran", "Dunyapur", "Kahror Pacca", "Mandi Bahauddin", "Malakwal", "Phalia", "Mianwali", "Kundian", "Isa Khel", "Multan", "Shujaabad", "Jalapur Pirwala", "Makhdoom Ahmed", "Murree", "Kotli Sattian", "Muzaffargarh", "Alipur", "Jatoi", "Narowal", "Shakargarh", "Zafarwal", "Nankana Sahib", "Shahkot", "Sangla Hill", "Okara", "Renala Khurd", "Depalpur", "Pakpattan", "Sahiwal", "Arifwala", "Rahim Yar Khan", "Sadiqabad", "Ahmedpur Lumma", "Rajanpur", "Jampur", "Fazilpur", "Rawalpindi", "Gujar Khan", "Taxila", "Kahuta", "Kallar Syedan", "Chichawatni", "Iqbal Nagar", "Sargodha", "Bhalwal", "Silanwali", "Sheikhupura", "Ferozewala", "Kot Abdul Malik", "Sialkot", "Daska", "Sambrial", "Pasrur", "Toba Tek Singh", "Pir Mahal", "Vehari", "Mailsi", "Burewala", "Ali Pur Chattha"];
            const sindh = ["Badin", "Matli", "Talhar", "Tando Bago", "Golarchi", "Sujawal", "Dadu", "Johi", "Bandhi", "Mehar", "Khairpur Nathan Shah", "Ghotki", "Mirpur Mathelo", "Daharki", "Ubauro", "Sadiqabad", "Hyderabad", "Latifabad", "Qasimabad", "Tando Jam", "Tando Allahyar", "Jacobabad", "Thul", "Garhi Khairo", "Jamshoro", "Kotri", "Manjhand", "Karachi", "North Nazimabad", "Liaquatabad", "Gulshan e Iqbal", "Faisal", "Saddar", "Clifton area", "Orangi Town", "SITE", "Korangi", "Landhi", "Keamari", "Baldia Town", "Malir", "Gadap Town", "Kashmore", "Kandhkot", "Tangwani", "Khairpur", "Kot Diji", "Gambat", "Faiz Ganj", "Larkana", "Ratodero", "Dokri", "Matiari", "Saeedabad", "Mirpur Khas", "Hussainabad", "Sindhri", "Naushahro Feroze", "Bhiria City", "Mehrabpur", "Moro", "Nawabshah", "Sakrand", "Qambar", "Shahdadkot", "Sijawal Junejo", "Sanghar", "Jam Nawaz Ali", "Tando Adam", "Shikarpur", "Lakhi Ghulam Shah", "Garhi Yasin", "Sukkur", "New Sukkur", "Rohri", "Pano Akil", "Bulri Shah Karim", "Tando Muhammad Khan", "Tando Ghulam Muhammad", "Mithi", "Islamkot", "Nagarparkar", "Diplo", "Thatta", "Ghorabari", "Keti Bandar", "Mirpur Bathoro", "Umerkot", "Kunri", "Samaro"];
            const balochistan = ["Awaran", "Gomeshk", "Qaderabad", "Barkhan", "Dalbandin", "Nokkundi", "Taftan", "Saindak", "Chaman", "Shagai", "Spin Boldak area", "Dera Bugti", "Sui Town", "Margha", "Phelawagh", "Duki", "Bagra", "Jandran", "Gidari", "Gwadar", "Jiwani", "Harnai", "Khost area", "Jogezai", "Dera Allah Yar", "Usta Muhammad", "Gandakha", "Gandava", "Jhal Magsi", "Dhadar", "Mach", "Bakhtiarabad", "Kalat", "Mangocher", "Karez", "Zehri", "Turbat", "Buleda", "Tump", "Mand", "Chitkan", "Kharan", "Khodan Khak", "Khuzdar", "Naal", "Karkh", "Habibabad", "Qila Abdullah", "Kohlu", "Bori", "Takatu", "Uthal", "Bela", "Hub", "Gadani", "Sonmiani", "Loralai", "Mastung", "Angoor Adda", "Killi Saifullah", "Musakhel", "Dera Murad Jamali", "Bhag", "Nushki", "Panjgur", "Gichk", "Parom Town", "Pishin", "Saranan", "Huramzai", "Muslim Bagh", "Quetta", "Surab", "Sherani", "Sibi", "Lehri", "Dehpal", "Kurak", "Sohbatpur Town", "Washuk", "Ziarat", "Nakai", "Zhob"];
            const kpk = ["Abbottabad", "Havelian", "Lora", "Khalabat", "Birote", "Nathiagali", "Sherwan", "Khar", "Nawagai", "Utmankhel", "Bannu", "Ghoriwala", "Batagram", "Allai", "Daggar", "Swabi", "Charsadda", "Prang", "Rajjar", "Dera Ismail Khan", "Kulachi", "Daraban", "Hangu", "Thall", "Haripur", "Khanpur", "Karak", "Takht e Nusrati", "Landi Kotal", "Jamrud", "Bara", "Kohat", "Darra Adam Khel", "Kolai", "Parachinar", "Sadda", "Lakki Marwat", "Shahbaz Khel", "Chitral", "Arandu", "Drosh", "Timergara", "Chakdara", "Batkhela", "Pattan", "Palas", "Dargai", "Thana", "Mansehra", "Balakot", "Oghi", "Baffa", "Mardan", "Takht Bhai", "Katlang", "Rustam", "Ghalanai", "Halimzai", "Miranshah", "Mirali", "Nowshera", "Akora Khattak", "Azakhel", "Kalaya", "Ghiljo", "Peshawar", "Hayatabad", "Chamkani", "Badaber", "Tehkal", "Alpuri", "Bisham", "Martung", "Wana", "Toi", "Shewa Adda", "Topi", "Mingora", "Saidu Sharif", "Matta", "Bahrain", "Kalam", "Tank", "Dabara", "Judba", "Booni", "Mastuj", "Brep", "Dir", "Barawal", "Lamoti", "Dasu", "Makhniyan"];
            const gb = ["Gilgit", "Danyore", "Juglot", "Gahkuch", "Phander", "Punial", "Ishkoman", "Yasin", "Aliabad", "Karimabad", "Gulmit", "Passu", "Hussaini", "Nagar", "Nagarkhas", "Shayar", "Jafarabad", "Chilas", "Babusar", "Thal", "Raikot", "Eidgah", "Astore Town", "Sazin", "Skardu", "Shigar", "Harcho", "Khaplu", "Tolti", "Besham", "Keris", "Darel", "Tangir", "Dambudas"];
            const ajk = ["Muzaffarabad", "Domel", "Khawaja Bazar", "Pattika", "Nasirabad", "Athmuqam", "Keran", "Sharda", "Kel", "Taobat", "Shounter", "Forward Kahuta", "Chakar", "Paniola", "Haveli", "Bhimber", "Samahni", "Barnala", "Chikkar", "Jandala", "Kotli", "Sehnsa", "Nakyal", "Khuiratta", "Dandli", "Mirpur", "Mangla", "Chakswari", "Islamgarh", "Khari Sharif", "Bagh", "Dhirkot", "Hari Ghel", "Sudhanoti", "Rawalakot", "Hajira", "Abbaspur", "Thorar", "Tain", "Pallandri", "Trarkhel", "Mankial", "Gulpur", "Hattian Bala", "Leepa Valley", "Mahni"];

            const cityData = [
                ...punjab.map(n => ({ name: n, province: "Punjab" })),
                ...sindh.map(n => ({ name: n, province: "Sindh" })),
                ...balochistan.map(n => ({ name: n, province: "Balochistan" })),
                ...kpk.map(n => ({ name: n, province: "KPK" })),
                ...gb.map(n => ({ name: n, province: "Gilgit Baltistan" })),
                ...ajk.map(n => ({ name: n, province: "Azad Kashmir" })),
            ];

            await City.insertMany(cityData);
            console.log(`Successfully seeded ${cityData.length} cities.`);
        }
    } catch (err) {
        console.error("Error seeding cities:", err);
    }
}
seedCities();

/* ========== SEED ADMIN USER ========== 
const User = require("./models/user");
async function seedAdmin() {
    try {
        const count = await User.countDocuments();
        if (count === 0) {
            const admin = new User({
                name: "Admin",
                email: "admin@pakteeth.com",
                password: "admin",
                role: "admin"
            });
            await admin.save();
            console.log("Seeded default admin user (admin@pakteeth.com / admin)");
        }
    } catch (err) {
        console.error("Error seeding admin:", err);
    }
}
seedAdmin();
*/
/* ========== START SERVER ========== */
app.listen(3000, async () => {
    console.log("Server running on port 3000");
    console.log("MongoDB Connected - All routes initialized");

    // ── Startup migration ──
    try {
        const mongoose = require("./database");
        // Wait a moment for the connection to be fully ready
        await new Promise(r => setTimeout(r, 2000));
        const db = mongoose.connection.db;
        if (db) {
            // 1) Drop stale unique indexes on email & phone in patients collection
            try {
                const patientsCol = db.collection("patients");
                const indexes = await patientsCol.indexes();
                for (const idx of indexes) {
                    if (idx.unique && idx.key) {
                        if (idx.key.email || idx.key.phone) {
                            console.log(`[Migration] Dropping stale unique index: ${idx.name}`);
                            await patientsCol.dropIndex(idx.name);
                        }
                    }
                }
                console.log("[Migration] Patient indexes cleaned ✓");
            } catch (e) {
                if (e.code !== 26) console.error("[Migration] Index cleanup error:", e.message);
            }

            // 2) Migrate old Report 'type' field → 'fileType'
            try {
                const reportsCol = db.collection("reports");
                const result = await reportsCol.updateMany(
                    { type: { $exists: true }, fileType: { $exists: false } },
                    [{ $set: { fileType: "$type" } }, { $unset: "type" }]
                );
                if (result.modifiedCount > 0) {
                    console.log(`[Migration] Migrated ${result.modifiedCount} reports: type → fileType ✓`);
                }
            } catch (e) {
                console.error("[Migration] Report migration error:", e.message);
            }
        }
    } catch (e) {
        console.error("[Migration] Startup migration failed:", e.message);
    }
});
