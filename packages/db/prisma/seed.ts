import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const mockNames = [
	"Budi Santoso", "Agus Setiawan", "Hendra Pratama", "Rina Wati", 
	"Eko Prasetyo", "Andi Wijaya", "Sri Mulyani", "Iwan Fals",
	"Dwi Cahyono", "Nina Safitri", "Arief Rahman", "Siti Aminah",
	"Rudi Hermawan", "Indra Gunawan", "Fajar Hidayat", "Bambang Pamungkas",
	"Putri Andini", "Kurniawan Dwi", "Joko Susilo", "Tono Haryanto"
];

// Base location for Jakarta
const BASE_LAT = -6.2088;
const BASE_LNG = 106.8456;

async function main() {
	console.log("Seeding Road Police (LANTAS) personnel...");

	let count = 0;
	for (const name of mockNames) {
		const badgeNo = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 digits
		
		// Randomize coordinates within ~5km of base
		const lat = BASE_LAT + (Math.random() - 0.5) * 0.05;
		const lng = BASE_LNG + (Math.random() - 0.5) * 0.05;

		const personnel = await prisma.personnel.create({
			data: {
				name,
				badgeNo,
				unitType: "LANTAS",
				currentStatus: "AVAILABLE",
				bwcDevice: {
					create: {
						deviceCode: `BWC-${badgeNo.substring(0, 4)}`,
						lastLat: lat,
						lastLng: lng,
						lastPingAt: new Date(),
						connectionStatus: "LIVE",
					},
				},
			},
		});

		count++;
		console.log(`Created LANTAS personnel: ${personnel.name} (${personnel.badgeNo})`);
	}

	console.log(`Successfully seeded ${count} personnel.`);
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
