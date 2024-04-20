import { transcode } from "buffer";
import * as fs from "fs";

if (!fs.existsSync("schools.json")) {
  const response = await fetch(
    "https://www.statistik.at/gs-atlas/ATLAS_SCHULE_WFS/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ATLAS_SCHULE_WFS:ATLAS_SCHULE&outputFormat=application%2Fjson&srsname=EPSG:3857&"
  );
  if (!response.ok) {
    console.error("Could not fetch base data", await response.text());
    process.exit(-1);
  }
  fs.writeFileSync(
    "schools.json",
    JSON.stringify(await response.json(), null, 2),
    "utf-8"
  );
}

const baseData = JSON.parse(fs.readFileSync("schools.json", "utf-8"));
console.log(baseData.features.length + " schools");

if (fs.existsSync("schools.csv")) {
  fs.unlinkSync("schools.csv");
}

const header =
  "type;skz;desc;coords;street;zip;city;keeper;classes;pupils;male;female";
fs.appendFileSync("schools.csv", header + "\n");
const schools = [];
for (const obj of baseData.features) {
  const props = obj.properties;
  const loc = obj.geometry.coordinates;
  const rowString = `${props.KARTO_TYP};${props.SKZ};${props.BEZEICHNUNG};${loc[0]},${loc[1]};${props.STR};${props.PLZ};${props.ORT};${props.ERHALTER};${props.KLASSEN};${props.SCHUELER_INSG};${props.SCHUELER_M};${props.SCHUELER_W}`;
  const row = {
    type: props.KARTO_TYP,
    skz: props.SKZ,
    desc: props.BEZEICHNUNG,
    coords: loc,
    street: props.STR,
    zip: props.PLZ,
    city: props.ORT,
    keeper: props.ERHALTER,
    classes: props.KLASSEN,
    pupils: props.SCHUELER_INSG,
    male: props.SCHUELER_M,
    female: props.SCHUELER_W,
  };
  schools.push(row);
  fs.appendFileSync("schools.csv", rowString + "\n");
}

if (!fs.existsSync("vs-left-to.json")) {
  if (fs.existsSync("vs-left-to.csv")) {
    fs.unlinkSync("vs-left-to.csv");
  }

  const headerLeftTo =
    "type;skz;desc;coords;street;zip;city;keeper;classes;pupils;male;female;lt_type;lt_skz;lt_desc;lt_ipub_desc;lt_street;lt_zip;lt_city;count";
  fs.appendFileSync("vs-left-to.csv", headerLeftTo + "\n");
  const leftTo = [];
  const vs = schools.filter((school) => school.type == "VS");
  let processed = 0;
  for (const school of vs) {
    const schoolString = `${school.type};${school.skz};${school.desc};${school.coords[0]},${school.coords[1]};${school.street};${school.zip};${school.city};${school.keeper};${school.classes};${school.pupils};${school.male};${school.female};`;

    const response = await fetch(
      `https://www.statistik.at/gs-atlas/ATLAS_SCHULE_WFS/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ATLAS_SCHULE_WFS:ATLAS_SCHULE_UEBERTRITT_OUT_WFS&maxFeatures=500&outputFormat=application%2Fjson&viewparams=SKZ:${school.skz}`
    );
    if (!response.ok) {
      console.error("Couldn't get leaves for school", school);
    }
    const leaves = (await response.json()).features;
    for (const leave of leaves) {
      const props = leave.properties;
      fs.appendFileSync(
        "vs-left-to.csv",
        schoolString +
          `${props.KARTO_TYP};${props.SKZ_LAUFEND};${props.BEZEICHNUNG};${props.IPUB2_BEZEICHNUNG};${props.STR};${props.PLZ};${props.ORT};${props.ANZAHL}` +
          "\n"
      );
      const left = {
        lt_type: props.KARTO_TYP,
        lt_skz: props.SKZ_LAUFEND,
        lt_desc: props.BEZEICHNUNG,
        lt_ipub_desc: props.IPUB2_BEZEICHNUNG,
        lt_street: props.STR,
        lt_zip: props.PLZ,
        lt_city: props.ORT,
        count: props.ANZAHL,
      };
      leftTo.push({ ...school, ...left });
    }
    processed++;
    console.log("Processed " + processed + "/" + vs.length);
  }
  fs.writeFileSync("vs-left-to.json", JSON.stringify(leftTo, null, 2), "utf-8");
}

const leftTo = JSON.parse(fs.readFileSync("vs-left-to.json"));
const toTypes = new Map();
const transformed = new Map();
if (fs.existsSync("vs-left-to-transformed.csv")) {
  fs.unlinkSync("vs-left-to-transformed.csv");
}
for (const row of leftTo) {
  const fromSchool = transformed.get(row.skz) ?? {
    type: row.type,
    skz: row.skz,
    desc: row.desc,
    coords: row.coords,
    street: row.street,
    zip: row.zip,
    city: row.city,
    keeper: row.keeper,
    classes: row.classes,
    pupils: row.pupils,
    male: row.male,
    female: row.female,
  };
  const type = toTypes.get(row.lt_type) ?? new Set();
  type.add(row.lt_ipub_desc);
  toTypes.set(row.lt_type, type);

  const leaves = fromSchool.leaves ?? {};
  leaves[row.lt_ipub_desc] =
    (leaves[row.lt_ipub_desc] ?? 0) + (row.count > 0 ? row.count : 1);
  fromSchool.leaves = leaves;
  transformed.set(fromSchool.skz, fromSchool);
}

let max = 0;
Array.from(transformed.keys()).forEach((key) => {
  const school = transformed.get(key);
  const count = school.leaves["AHS-Unterstufe"] ?? 0;
  school.score = count / school.pupils;
  if (school.score > max) max = school.score;
});

Array.from(transformed.keys()).forEach((key) => {
  const school = transformed.get(key);
  school.score = school.score / max;
});

const scoredSchools = Array.from(transformed.keys())
  .map((key) => transformed.get(key))
  .sort((a, b) => b.score - a.score);

fs.writeFileSync(
  "vs-left-to-scored.json",
  JSON.stringify(scoredSchools, null, 2)
);

if (fs.existsSync("vs-left-to-scored.csv")) {
  fs.unlinkSync("vs-left-to-scored.csv");
}

const leaveTypes = [
  "AHS-Unterstufe",
  "Neue Mittelschule an AHS",
  "Neue Mittelschule an Hauptschulen",
  "Sonderschulen",
  "Sonst. allgemeinbild. (Statut)Schulen",
  "Wiederholung der Schulstufe im gleichen Schultyp",
];
const headerScored =
  "type;skz;desc;coords;street;zip;city;keeper;classes;pupils;male;female;score;" +
  leaveTypes.join(";");
fs.appendFileSync("vs-left-to-scored.csv", headerScored + "\n", "utf-8");
for (const school of scoredSchools) {
  const counts = leaveTypes
    .map((type) => {
      return school.leaves[type] ?? "";
    })
    .join(";");
  const row = `${school.type};${school.skz};${school.desc};${school.coords[0]},${school.coords[1]};${school.street};${school.zip};${school.city};${school.keeper};${school.classes};${school.pupils};${school.male};${school.female};${school.score};${counts}`;
  fs.appendFileSync("vs-left-to-scored.csv", row + "\n", "utf-8");
}

console.log(toTypes);
