console.log("main.js loaded");

const PATHS = {
  monthly: "Datasets Clean/monthly_arrivals_long.csv",
  quarterly: "Datasets Clean/quarterly_arrivals_long.csv",
  stateCore: "Datasets Clean/state_hotel_performance_core.csv",
  expenditure: "Datasets Clean/tourism_expenditure_products_long.csv",
  guestMix: "Datasets Clean/state_guest_mix_2015_2017.csv",
  geo: "Datasets Clean/geoBoundaries-MYS-ADM1_simplified.geojson"
};

const MONTH_ORDER = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

const BASE_CONFIG = {
  $schema: "https://vega.github.io/schema/vega-lite/v5.json",
  background: null,
  width: "container",
  autosize: {
    type: "fit-x",
    contains: "padding"
  },
  config: {
    view: { stroke: null },
    axis: {
      labelFont: "Arial",
      titleFont: "Arial",
      labelFontSize: 11,
      titleFontSize: 12,
      labelColor: "#5d6776",
      titleColor: "#13233f",
      gridColor: "#e5e7eb"
    },
    legend: {
      labelFont: "Arial",
      titleFont: "Arial",
      labelColor: "#5d6776",
      titleColor: "#13233f"
    }
  }
};

function makeSpec(spec) {
  return {
    ...BASE_CONFIG,
    ...spec,
    config: {
      ...BASE_CONFIG.config,
      ...(spec.config || {})
    }
  };
}

function renderChart(targetId, spec) {
  vegaEmbed(`#${targetId}`, spec, { actions: false, renderer: "svg" })
    .then(() => console.log(`${targetId} rendered successfully`))
    .catch((error) => {
      console.error(`Error rendering ${targetId}:`, error);
      const target = document.getElementById(targetId);
      if (target) {
        target.innerHTML = `
          <div class="error-box">
            <strong>Chart failed to render:</strong> ${targetId}<br>
            Open the browser console to inspect the Vega-Lite error.
          </div>
        `;
      }
    });
}

/* 1. Monthly arrivals */
const monthlyArrivalsSpec = makeSpec({
  height: 280,
  data: { url: PATHS.monthly },
  transform: [
    { filter: "!(datum.year == 2023 && datum.arrivals == 0)" }
  ],
  mark: {
    type: "line",
    color: "#2F6FB2",
    strokeWidth: 3,
    interpolate: "monotone"
  },
  encoding: {
    x: {
      field: "date",
      type: "temporal",
      title: "Month",
      axis: { format: "%Y", labelAngle: 0, grid: false }
    },
    y: {
      field: "arrivals",
      type: "quantitative",
      title: "Arrivals",
      axis: { format: "~s" }
    },
    tooltip: [
      { field: "date", type: "temporal", title: "Month", format: "%b %Y" },
      { field: "arrivals", type: "quantitative", title: "Arrivals", format: "," }
    ]
  }
});

/* 2. Quarterly arrivals */
const quarterlyArrivalsSpec = makeSpec({
  height: 280,
  data: { url: PATHS.quarterly },
  transform: [
    { filter: "!(datum.year == 2023 && datum.arrivals == 0)" }
  ],
  layer: [
    {
      mark: { type: "area", color: "#2BB1A3", opacity: 0.18 }
    },
    {
      mark: { type: "line", color: "#0F1F3A", strokeWidth: 2.5 }
    }
  ],
  encoding: {
    x: {
      field: "date",
      type: "temporal",
      title: "Quarter",
      axis: { format: "%Y", labelAngle: 0, grid: false }
    },
    y: {
      field: "arrivals",
      type: "quantitative",
      title: "Arrivals",
      axis: { format: "~s" }
    },
    tooltip: [
      { field: "year", type: "quantitative", title: "Year", format: ".0f" },
      { field: "quarter", type: "nominal", title: "Quarter" },
      { field: "arrivals", type: "quantitative", title: "Arrivals", format: "," }
    ]
  }
});

/* 3. Heatmap */
const seasonalityHeatmapSpec = makeSpec({
  height: 280,
  data: { url: PATHS.monthly },
  transform: [
    { filter: "!(datum.year == 2023 && datum.arrivals == 0)" }
  ],
  mark: { type: "rect", cornerRadius: 2 },
  encoding: {
    x: {
      field: "month",
      type: "ordinal",
      sort: MONTH_ORDER,
      title: "Month"
    },
    y: {
      field: "year",
      type: "ordinal",
      title: "Year"
    },
    color: {
      field: "arrivals",
      type: "quantitative",
      title: "Arrivals",
      scale: { scheme: "blues" }
    },
    tooltip: [
      { field: "year", type: "quantitative", title: "Year", format: ".0f" },
      { field: "month", type: "nominal", title: "Month" },
      { field: "arrivals", type: "quantitative", title: "Arrivals", format: "," }
    ]
  }
});

/* 4. State map */
const stateMapSpec = makeSpec({
  height: 330,
  data: { url: PATHS.stateCore },
  transform: [
    { filter: "datum.year == 2022" },
    {
      lookup: "shapeName",
      from: {
        data: { url: PATHS.geo, format: { type: "geojson" } },
        key: "properties.shapeName",
        fields: ["geometry"]
      },
      as: "geo"
    }
  ],
  projection: { type: "mercator" },
  mark: { type: "geoshape", stroke: "#ffffff", strokeWidth: 1.2 },
  encoding: {
    shape: { field: "geo", type: "geojson" },
    color: {
      field: "international_hotel_guests",
      type: "quantitative",
      title: "International guests",
      scale: { scheme: "blues" }
    },
    tooltip: [
      { field: "state", type: "nominal", title: "State" },
      {
        field: "international_hotel_guests",
        type: "quantitative",
        title: "International hotel guests",
        format: ","
      },
      {
        field: "occupancy_rate",
        type: "quantitative",
        title: "Occupancy rate (%)",
        format: ".1f"
      }
    ]
  }
});

/* 5. Top states */
const topStatesSpec = makeSpec({
  height: 330,
  data: { url: PATHS.stateCore },
  transform: [
    { filter: "datum.year == 2022" },
    {
      window: [{ op: "rank", as: "rank" }],
      sort: [{ field: "international_hotel_guests", order: "descending" }]
    },
    { filter: "datum.rank <= 10" }
  ],
  mark: { type: "bar", color: "#2F6FB2", cornerRadiusEnd: 4 },
  encoding: {
    y: {
      field: "state",
      type: "nominal",
      sort: "-x",
      title: null
    },
    x: {
      field: "international_hotel_guests",
      type: "quantitative",
      title: "International hotel guests",
      axis: { format: "~s" }
    },
    tooltip: [
      { field: "state", type: "nominal", title: "State" },
      {
        field: "international_hotel_guests",
        type: "quantitative",
        title: "International hotel guests",
        format: ","
      }
    ]
  }
});

/* 6. State trends */
const stateTrendsSpec = makeSpec({
  height: 330,
  data: { url: PATHS.stateCore },
  transform: [
    {
      filter: "indexof(['Kuala Lumpur','Johor','Pahang','Selangor','Penang'], datum.state) >= 0"
    }
  ],
  mark: { type: "line", point: true, strokeWidth: 2.2 },
  encoding: {
    x: {
      field: "year",
      type: "ordinal",
      title: "Year"
    },
    y: {
      field: "international_hotel_guests",
      type: "quantitative",
      title: "International hotel guests",
      axis: { format: "~s" }
    },
    color: {
      field: "state",
      type: "nominal",
      title: "State",
      scale: {
        range: ["#2F6FB2", "#2BB1A3", "#0F1F3A", "#7E78D2", "#7BA87D"]
      }
    },
    tooltip: [
      { field: "state", type: "nominal", title: "State" },
      { field: "year", type: "quantitative", title: "Year", format: ".0f" },
      {
        field: "international_hotel_guests",
        type: "quantitative",
        title: "International hotel guests",
        format: ","
      }
    ]
  }
});

/* 7. Missing chart fixed: International Hotel Guests by State */
const internationalStateBarSpec = makeSpec({
  height: 320,
  data: { url: PATHS.stateCore },
  transform: [{ filter: "datum.year == 2022" }],
  mark: { type: "bar", color: "#315FC9", cornerRadiusEnd: 4 },
  encoding: {
    y: {
      field: "state",
      type: "nominal",
      sort: "-x",
      title: null
    },
    x: {
      field: "international_hotel_guests",
      type: "quantitative",
      title: "International hotel guests",
      axis: { format: "~s" }
    },
    tooltip: [
      { field: "state", type: "nominal", title: "State" },
      {
        field: "international_hotel_guests",
        type: "quantitative",
        title: "International hotel guests",
        format: ","
      }
    ]
  }
});

/* 8. Guest mix */
const guestMixSpec = makeSpec({
  height: 320,
  data: { url: PATHS.guestMix },
  transform: [
    { filter: "datum.year == 2017" },
    {
      fold: ["domestic_hotel_guests", "international_hotel_guests"],
      as: ["guest_type", "guests"]
    },
    {
      calculate: "datum.guest_type == 'domestic_hotel_guests' ? 'Domestic' : 'International'",
      as: "guest_type_label"
    }
  ],
  mark: { type: "bar", cornerRadiusEnd: 2 },
  encoding: {
    y: {
      field: "state",
      type: "nominal",
      sort: "-x",
      title: null
    },
    x: {
      field: "guests",
      type: "quantitative",
      stack: "zero",
      title: "Hotel guests",
      axis: { format: "~s" }
    },
    color: {
      field: "guest_type_label",
      type: "nominal",
      title: "Guest type",
      scale: {
        domain: ["Domestic", "International"],
        range: ["#8AA3E6", "#17376F"]
      }
    },
    tooltip: [
      { field: "state", type: "nominal", title: "State" },
      { field: "guest_type_label", type: "nominal", title: "Guest type" },
      { field: "guests", type: "quantitative", title: "Guests", format: "," }
    ]
  }
});

/* 9. Occupancy */
const occupancySpec = makeSpec({
  height: 320,
  data: { url: PATHS.stateCore },
  transform: [{ filter: "datum.year == 2022" }],
  mark: { type: "bar", color: "#2BB1A3", cornerRadiusEnd: 4 },
  encoding: {
    y: {
      field: "state",
      type: "nominal",
      sort: "-x",
      title: null
    },
    x: {
      field: "occupancy_rate",
      type: "quantitative",
      title: "Occupancy rate (%)"
    },
    tooltip: [
      { field: "state", type: "nominal", title: "State" },
      {
        field: "occupancy_rate",
        type: "quantitative",
        title: "Occupancy rate (%)",
        format: ".1f"
      }
    ]
  }
});

/* 10. Scatter */
const guestsVsOccupancySpec = makeSpec({
  height: 320,
  data: { url: PATHS.stateCore },
  transform: [{ filter: "datum.year == 2022" }],
  layer: [
    {
      mark: {
        type: "point",
        filled: true,
        size: 140,
        color: "#7E78D2",
        opacity: 0.72
      },
      encoding: {
        x: {
          field: "international_hotel_guests",
          type: "quantitative",
          title: "International hotel guests",
          axis: { format: "~s" }
        },
        y: {
          field: "occupancy_rate",
          type: "quantitative",
          title: "Occupancy rate (%)"
        },
        tooltip: [
          { field: "state", type: "nominal", title: "State" },
          {
            field: "international_hotel_guests",
            type: "quantitative",
            title: "International hotel guests",
            format: ","
          },
          {
            field: "occupancy_rate",
            type: "quantitative",
            title: "Occupancy rate (%)",
            format: ".1f"
          }
        ]
      }
    },
    {
      transform: [{ filter: "datum.international_hotel_guests >= 1200000" }],
      mark: { type: "text", dy: -10, fontSize: 10, color: "#13233f" },
      encoding: {
        x: { field: "international_hotel_guests", type: "quantitative" },
        y: { field: "occupancy_rate", type: "quantitative" },
        text: { field: "state", type: "nominal" }
      }
    }
  ]
});

/* 11. Expenditure area */
const expenditureAreaSpec = makeSpec({
  height: 300,
  data: { url: PATHS.expenditure },
  mark: { type: "area", opacity: 0.84 },
  encoding: {
    x: {
      field: "year",
      type: "ordinal",
      title: "Year"
    },
    y: {
      field: "expenditure_rm_million",
      type: "quantitative",
      stack: "zero",
      title: "Expenditure (RM million)"
    },
    color: {
      field: "product",
      type: "nominal",
      title: "Product",
      scale: { scheme: "tableau20" }
    },
    tooltip: [
      { field: "year", type: "quantitative", title: "Year", format: ".0f" },
      { field: "product", type: "nominal", title: "Product" },
      {
        field: "expenditure_rm_million",
        type: "quantitative",
        title: "Expenditure (RM million)",
        format: ",.1f"
      }
    ]
  }
});

/* 12. Expenditure share donut */
const expenditureShareSpec = makeSpec({
  height: 300,
  data: { url: PATHS.expenditure },
  transform: [{ filter: "datum.year == 2020" }],
  layer: [
    {
      mark: { type: "arc", innerRadius: 70, outerRadius: 120 },
      encoding: {
        theta: {
          field: "expenditure_rm_million",
          type: "quantitative"
        },
        color: {
          field: "product",
          type: "nominal",
          title: "Product",
          scale: { scheme: "tableau20" }
        },
        tooltip: [
          { field: "product", type: "nominal", title: "Product" },
          {
            field: "expenditure_rm_million",
            type: "quantitative",
            title: "Expenditure (RM million)",
            format: ",.1f"
          }
        ]
      }
    }
  ]
});

/* 13. Latest expenditure bar */
const expenditureLatestSpec = makeSpec({
  height: 300,
  data: { url: PATHS.expenditure },
  transform: [{ filter: "datum.year == 2020" }],
  mark: { type: "bar", color: "#2F6FB2", cornerRadiusEnd: 4 },
  encoding: {
    y: {
      field: "product",
      type: "nominal",
      sort: "-x",
      title: null
    },
    x: {
      field: "expenditure_rm_million",
      type: "quantitative",
      title: "Expenditure (RM million)"
    },
    tooltip: [
      { field: "product", type: "nominal", title: "Product" },
      {
        field: "expenditure_rm_million",
        type: "quantitative",
        title: "Expenditure (RM million)",
        format: ",.1f"
      }
    ]
  }
});

renderChart("chart-monthly-arrivals", monthlyArrivalsSpec);
renderChart("chart-quarterly-arrivals", quarterlyArrivalsSpec);
renderChart("chart-seasonality-heatmap", seasonalityHeatmapSpec);
renderChart("chart-state-map", stateMapSpec);
renderChart("chart-top-states", topStatesSpec);
renderChart("chart-state-trends", stateTrendsSpec);
renderChart("chart-international-state-bar", internationalStateBarSpec);
renderChart("chart-guest-mix", guestMixSpec);
renderChart("chart-occupancy", occupancySpec);
renderChart("chart-guests-vs-occupancy", guestsVsOccupancySpec);
renderChart("chart-expenditure-area", expenditureAreaSpec);
renderChart("chart-expenditure-share", expenditureShareSpec);
renderChart("chart-expenditure-latest", expenditureLatestSpec);