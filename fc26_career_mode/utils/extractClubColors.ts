"use client";

const ColorThief = require("colorthief");

export async function extractClubColors(imageUrl: string) {

  return new Promise<{
    primary: string;
    secondary: string;
  }>((resolve) => {

    const img = document.createElement("img");

    img.crossOrigin = "Anonymous";

    img.src = imageUrl;

    img.onload = () => {

      try {

        const colorThief = new ColorThief();

        const palette = colorThief.getPalette(img, 2);

        const primary = palette[0];
        const secondary = palette[1];

        resolve({
          primary: `rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`,
          secondary: `rgb(${secondary[0]}, ${secondary[1]}, ${secondary[2]})`,
        });

      } catch (err) {

        console.error(err);

        resolve({
          primary: "#1e293b",
          secondary: "#0f172a",
        });

      }

    };

  });

}