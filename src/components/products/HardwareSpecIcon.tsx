import React from "react";

export type HardwarePartType =
  | "cpu"
  | "gpu"
  | "motherboard"
  | "ram"
  | "storage"
  | "psu"
  | "tower"
  | "cooling";

export interface HardwareSpecIconProps {
  part: HardwarePartType;
  className?: string;
}

export function HardwareSpecIcon({
  part,
  className,
}: HardwareSpecIconProps): JSX.Element {
  const commonSvgProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (part) {
    case "cpu":
      return React.createElement(
        "svg",
        {
          ...commonSvgProps,
          "aria-label": "cpu",
        },
        // Outer socket substrate package
        React.createElement("rect", {
          x: "3.5",
          y: "3.5",
          width: "17",
          height: "17",
          rx: "1.5",
        }),
        // Stepped integrated heat spreader (IHS)
        React.createElement("rect", {
          x: "6.5",
          y: "6.5",
          width: "11",
          height: "11",
          rx: "1.2",
        }),
        // Silicon core die
        React.createElement("rect", {
          x: "9.5",
          y: "9.5",
          width: "5",
          height: "5",
          rx: "0.5",
        }),
        // Pin 1 orientation triangle marker
        React.createElement("circle", {
          cx: "5.2",
          cy: "5.2",
          r: "0.75",
          fill: "currentColor",
          stroke: "none",
        }),
        // Substrate alignment key notches
        React.createElement("line", {
          x1: "12",
          y1: "3.5",
          x2: "12",
          y2: "4.5",
        }),
        React.createElement("line", {
          x1: "12",
          y1: "19.5",
          x2: "12",
          y2: "20.5",
        })
      );

    case "gpu":
      return React.createElement(
        "svg",
        {
          ...commonSvgProps,
          "aria-label": "gpu",
        },
        // Rear I/O metal bracket
        React.createElement("path", {
          d: "M2 5v14M2 7h2M2 17h2",
        }),
        // Main cooler shroud body
        React.createElement("rect", {
          x: "4",
          y: "7",
          width: "17.5",
          height: "10",
          rx: "1.5",
        }),
        // Dual axial fan cutouts
        React.createElement("circle", {
          cx: "9",
          cy: "12",
          r: "3",
        }),
        React.createElement("circle", {
          cx: "15.5",
          cy: "12",
          r: "3",
        }),
        // Fan rotor hubs
        React.createElement("circle", {
          cx: "9",
          cy: "12",
          r: "0.8",
          fill: "currentColor",
          stroke: "none",
        }),
        React.createElement("circle", {
          cx: "15.5",
          cy: "12",
          r: "0.8",
          fill: "currentColor",
          stroke: "none",
        }),
        // Fan rotor blades
        React.createElement("path", {
          d: "M9 10.5v3M7.5 12h3M15.5 10.5v3M14 12h3",
        }),
        // PCIe golden fingers connector
        React.createElement("path", {
          d: "M6.5 17v2.5h8V17",
        }),
        React.createElement("line", {
          x1: "9",
          y1: "17",
          x2: "9",
          y2: "19.5",
        }),
        React.createElement("line", {
          x1: "12",
          y1: "17",
          x2: "12",
          y2: "19.5",
        }),
        // PCIe supplementary power header
        React.createElement("path", {
          d: "M16.5 7V5.5h3.5V7",
        })
      );

    case "motherboard":
      return React.createElement(
        "svg",
        {
          ...commonSvgProps,
          "aria-label": "motherboard",
        },
        // Mainboard PCB outline
        React.createElement("rect", {
          x: "3",
          y: "3",
          width: "18",
          height: "18",
          rx: "1.5",
        }),
        // CPU socket frame
        React.createElement("rect", {
          x: "5.5",
          y: "5.5",
          width: "6",
          height: "6",
          rx: "0.5",
        }),
        // Socket lever and pin indicator
        React.createElement("line", {
          x1: "7.5",
          y1: "8.5",
          x2: "9.5",
          y2: "8.5",
        }),
        // Parallel DDR5 DIMM memory channels
        React.createElement("line", {
          x1: "14",
          y1: "5",
          x2: "14",
          y2: "12",
        }),
        React.createElement("line", {
          x1: "16.5",
          y1: "5",
          x2: "16.5",
          y2: "12",
        }),
        React.createElement("line", {
          x1: "19",
          y1: "5",
          x2: "19",
          y2: "12",
        }),
        // Primary reinforced PCIe x16 expansion slot
        React.createElement("rect", {
          x: "5.5",
          y: "14.5",
          width: "12",
          height: "2",
          rx: "0.4",
        }),
        // Secondary PCIe slot
        React.createElement("line", {
          x1: "5.5",
          y1: "18.5",
          x2: "13.5",
          y2: "18.5",
        }),
        // Chipset passive heatsink
        React.createElement("rect", {
          x: "15.5",
          y: "14.5",
          width: "3.5",
          height: "4",
          rx: "0.5",
        })
      );

    case "ram":
      return React.createElement(
        "svg",
        {
          ...commonSvgProps,
          "aria-label": "ram",
        },
        // Finned heatspreader casing and PCB body
        React.createElement("path", {
          d: "M2.5 10.5L4 8h3l1.5 2h2l1.5-2h2l1.5 2h2l1.5-2h2.5l1.5 2.5v5H2.5v-5z",
        }),
        // Gold contact pin tabs with DDR5 center key notch
        React.createElement("path", {
          d: "M3.5 15.5v2.5h6.5v-2.5M12 15.5v2.5h8.5v-2.5",
        }),
        // Gold pin detail dividers
        React.createElement("line", {
          x1: "6",
          y1: "15.5",
          x2: "6",
          y2: "18",
        }),
        React.createElement("line", {
          x1: "8.5",
          y1: "15.5",
          x2: "8.5",
          y2: "18",
        }),
        React.createElement("line", {
          x1: "15",
          y1: "15.5",
          x2: "15",
          y2: "18",
        }),
        React.createElement("line", {
          x1: "17.5",
          y1: "15.5",
          x2: "17.5",
          y2: "18",
        }),
        // Heatspreader accent groove
        React.createElement("line", {
          x1: "4.5",
          y1: "13",
          x2: "19.5",
          y2: "13",
        })
      );

    case "storage":
      return React.createElement(
        "svg",
        {
          ...commonSvgProps,
          "aria-label": "storage",
        },
        // M.2 2280 PCB stick with standoff semicircle notch on left
        React.createElement("path", {
          d: "M3 10a2 2 0 0 0 0 4v2.5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1V10z",
        }),
        // M.2 gold connector boundary
        React.createElement("line", {
          x1: "18",
          y1: "7.5",
          x2: "18",
          y2: "16.5",
        }),
        // M-key notch
        React.createElement("line", {
          x1: "19.5",
          y1: "11",
          x2: "21",
          y2: "11",
        }),
        // High-speed NVMe controller chip
        React.createElement("rect", {
          x: "13",
          y: "9.5",
          width: "3.5",
          height: "5",
          rx: "0.5",
        }),
        // Dual 3D NAND flash memory packages
        React.createElement("rect", {
          x: "5.5",
          y: "9",
          width: "3",
          height: "6",
          rx: "0.5",
        }),
        React.createElement("rect", {
          x: "9.2",
          y: "9",
          width: "3",
          height: "6",
          rx: "0.5",
        })
      );

    case "psu":
      return React.createElement(
        "svg",
        {
          ...commonSvgProps,
          "aria-label": "psu",
        },
        // ATX chassis enclosure
        React.createElement("rect", {
          x: "3",
          y: "3",
          width: "18",
          height: "18",
          rx: "2",
        }),
        // Intake fan ring
        React.createElement("circle", {
          cx: "11.5",
          cy: "12",
          r: "5.5",
        }),
        // Fan center hub
        React.createElement("circle", {
          cx: "11.5",
          cy: "12",
          r: "1.5",
          fill: "currentColor",
          stroke: "none",
        }),
        // Fan grill spokes
        React.createElement("line", {
          x1: "11.5",
          y1: "6.5",
          x2: "11.5",
          y2: "17.5",
        }),
        React.createElement("line", {
          x1: "6",
          y1: "12",
          x2: "17",
          y2: "12",
        }),
        React.createElement("line", {
          x1: "7.6",
          y1: "8.1",
          x2: "15.4",
          y2: "15.9",
        }),
        React.createElement("line", {
          x1: "7.6",
          y1: "15.9",
          x2: "15.4",
          y2: "8.1",
        }),
        // Modular power cable output bank
        React.createElement("rect", {
          x: "18",
          y: "6",
          width: "1.8",
          height: "2.2",
          rx: "0.4",
        }),
        React.createElement("rect", {
          x: "18",
          y: "9.5",
          width: "1.8",
          height: "2.2",
          rx: "0.4",
        }),
        React.createElement("rect", {
          x: "18",
          y: "13",
          width: "1.8",
          height: "2.2",
          rx: "0.4",
        }),
        React.createElement("rect", {
          x: "18",
          y: "16.5",
          width: "1.8",
          height: "2.2",
          rx: "0.4",
        })
      );

    case "tower":
      return React.createElement(
        "svg",
        {
          ...commonSvgProps,
          "aria-label": "tower",
        },
        // Main tower chassis
        React.createElement("rect", {
          x: "4",
          y: "3",
          width: "16",
          height: "17",
          rx: "1.5",
        }),
        // Case feet
        React.createElement("rect", {
          x: "5.5",
          y: "20",
          width: "3",
          height: "1.5",
          rx: "0.4",
        }),
        React.createElement("rect", {
          x: "15.5",
          y: "20",
          width: "3",
          height: "1.5",
          rx: "0.4",
        }),
        // Panoramic tempered glass window
        React.createElement("rect", {
          x: "6.5",
          y: "5.5",
          width: "11.5",
          height: "12",
          rx: "0.8",
        }),
        // PSU shroud basement partition
        React.createElement("line", {
          x1: "6.5",
          y1: "14.5",
          x2: "18",
          y2: "14.5",
        }),
        // Top front I/O button and port
        React.createElement("circle", {
          cx: "17",
          cy: "4.2",
          r: "0.6",
          fill: "currentColor",
          stroke: "none",
        }),
        React.createElement("line", {
          x1: "14.5",
          y1: "3",
          x2: "14.5",
          y2: "4.2",
        }),
        // Interior hardware silhouette
        React.createElement("line", {
          x1: "8.5",
          y1: "10",
          x2: "14.5",
          y2: "10",
        })
      );

    case "cooling":
      return React.createElement(
        "svg",
        {
          ...commonSvgProps,
          "aria-label": "cooling",
        },
        // Top 360mm radiator assembly
        React.createElement("rect", {
          x: "3",
          y: "3",
          width: "18",
          height: "5",
          rx: "1",
        }),
        // Radiator triple fan division markers
        React.createElement("line", {
          x1: "9",
          y1: "3",
          x2: "9",
          y2: "8",
        }),
        React.createElement("line", {
          x1: "15",
          y1: "3",
          x2: "15",
          y2: "8",
        }),
        // CPU pump block / water cooler
        React.createElement("circle", {
          cx: "12",
          cy: "17",
          r: "3.5",
        }),
        React.createElement("circle", {
          cx: "12",
          cy: "17",
          r: "1.5",
        }),
        // Braided liquid cooling tubing
        React.createElement("path", {
          d: "M6 8v1.5c0 3 3 4.5 4.5 5.5",
        }),
        React.createElement("path", {
          d: "M8 8v1c0 2 2.5 3.5 4 4.5",
        })
      );

    default:
      return React.createElement(
        "svg",
        {
          ...commonSvgProps,
          "aria-label": "hardware",
        },
        // Generic hardware microchip package
        React.createElement("rect", {
          x: "5.5",
          y: "5.5",
          width: "13",
          height: "13",
          rx: "1.5",
        }),
        // Silicon core die
        React.createElement("rect", {
          x: "8.5",
          y: "8.5",
          width: "7",
          height: "7",
          rx: "0.5",
        }),
        // Peripheral connector leads
        React.createElement("path", {
          d: "M9 2.5v3M12 2.5v3M15 2.5v3M9 18.5v3M12 18.5v3M15 18.5v3M2.5 9h3M2.5 12h3M2.5 15h3M18.5 9h3M18.5 12h3M18.5 15h3",
        })
      );
  }
}
