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
  }
  processed++;
  console.log("Processed " + processed + "/" + vs.length);
}
