import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(toolDirectory, "..");
const cardRoot = join(toolDirectory, "card-source");
const outputRoot = join(repository, "assets/current/cards");
const temporaryRoot = join(outputRoot, ".render");
const layoutPayload = JSON.parse(
  readFileSync(join(cardRoot, "physical-deck-layout-v16.json"), "utf8"),
);
const podkovaSource = join(
  cardRoot,
  "fonts/Podkova-Variable.ttf",
);

const cards = [
  ["wheat", "3"],
  ["wheat", "6"],
  ["wheat", "7"],
  ["wheat", "9"],
  ["wheat", "10"],
  ["wheat", "queen"],
  ["wheat", "king"],
  ["sunflower", "9"],
  ["sunflower", "king"],
  ["potato", "jack"],
  ["beet", "6"],
  ["beet", "8"],
  ["beet", "9"],
  ["beet", "king"],
  ["beet", "8", "trump"],
  ["beet", "king", "trump"],
];

const renderTextWithPillow = `
import sys
from PIL import Image, ImageDraw, ImageFont

output, font_path, text, point_size = sys.argv[1:]
font = ImageFont.truetype(font_path, round(float(point_size)))
probe = Image.new("RGBA", (1, 1))
bounds = ImageDraw.Draw(probe).textbbox((0, 0), text, font=font, anchor="mm")
width = max(1, bounds[2] - bounds[0] + 12)
height = max(1, bounds[3] - bounds[1] + 12)
image = Image.new("RGBA", (width, height))
ImageDraw.Draw(image).text(
    (width / 2, height / 2),
    text,
    font=font,
    fill=(38, 48, 37, 255),
    anchor="mm",
)
crop = image.getbbox()
(image.crop(crop) if crop else image).save(output)
`;

mkdirSync(temporaryRoot, { recursive: true });
const podkova = join(temporaryRoot, "Podkova-700.ttf");
execFileSync(
  "python3",
  [
    "-m",
    "fontTools.varLib.instancer",
    podkovaSource,
    "wght=700",
    `--output=${podkova}`,
  ],
  { stdio: "ignore" },
);

function runMagick(arguments_) {
  execFileSync("magick", arguments_, { stdio: "ignore" });
}

function dimensions(path) {
  return execFileSync("magick", ["identify", "-format", "%w %h", path], {
    encoding: "utf8",
  })
    .trim()
    .split(" ")
    .map(Number);
}

for (const [suit, rank, frameOverride] of cards) {
  const layout = layoutPayload.layouts[`${suit}-${rank}`];
  const frameName = frameOverride || suit;
  const frame = join(cardRoot, `frames/card-frame-${frameName}.png`);
  const suitArt = join(cardRoot, `suits/suit-${suit}.png`);
  const faceArt =
    rank === "jack" || rank === "queen" || rank === "king"
      ? join(cardRoot, `faces/face-${rank}-${suit}.png`)
      : null;

  const suffix = frameOverride ? `-${frameOverride}` : "";
  const baseName = `${suit}-${rank}${suffix}`;
  const workingPath = join(temporaryRoot, `${baseName}.png`);
  const outputPath = join(outputRoot, `${baseName}.webp`);
  runMagick([frame, "-resize", "1644x2244!", workingPath]);

  let pieceIndex = 0;
  for (const [id, piece] of Object.entries(layout)) {
    if (id === "topTrumpInset" || id === "bottomTrumpInset") continue;
    const piecePath = join(temporaryRoot, `${baseName}-${pieceIndex++}.png`);

    if (piece.type === "rank" || piece.type === "caption") {
      const pointSize =
        piece.fontSize ||
        (piece.type === "caption" ? piece.visualHeight * 1.22 : piece.visualHeight * 1.24);
      execFileSync(
        "python3",
        ["-c", renderTextWithPillow, piecePath, podkova, piece.text, `${pointSize}`],
        { stdio: "ignore" },
      );
      if (piece.rotation) {
        runMagick([piecePath, "-background", "none", "-rotate", `${piece.rotation}`, piecePath]);
      }
      const [width, height] = dimensions(piecePath);
      runMagick([
        workingPath,
        piecePath,
        "-geometry",
        `+${Math.round(piece.x - width / 2)}+${Math.round(piece.y - height / 2)}`,
        "-composite",
        workingPath,
      ]);
      continue;
    }

    if (piece.type !== "image") continue;
    const source = id === "centralFace" ? faceArt : suitArt;
    runMagick([
      source,
      "-resize",
      `${piece.width}x${piece.height}`,
      "-gravity",
      "center",
      "-background",
      "none",
      "-extent",
      `${piece.width}x${piece.height}`,
      ...(piece.rotation ? ["-rotate", `${piece.rotation}`] : []),
      piecePath,
    ]);
    runMagick([
      workingPath,
      piecePath,
      "-geometry",
      `+${Math.round(piece.x)}+${Math.round(piece.y)}`,
      "-composite",
      workingPath,
    ]);
  }

  runMagick([workingPath, "-resize", "616x842!", "-quality", "88", outputPath]);
}

rmSync(temporaryRoot, { recursive: true, force: true });
