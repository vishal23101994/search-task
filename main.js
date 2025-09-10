// ----------------- Initialize map -----------------
var map = L.map('map', {
  center: [24.4539, 54.3773],
  zoom: 12,
  attributionControl: false,
  zoomControl: false
});

// ----------------- Base Layers -----------------
var GoogleStreets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
  subdomains: ['mt0','mt1','mt2','mt3']
});
var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
var Esri_WorldImagery_minimap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
var openstreetmap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

GoogleStreets.addTo(map);


L.control.scale().addTo(map);
L.control.mousePosition({ position: 'bottomright' }).addTo(map);
L.control.zoom({ position: 'topright' }).addTo(map);

var miniMap = new L.Control.MiniMap(Esri_WorldImagery_minimap, {
  position: 'bottomright',
  height: 150,
  width: 150
}).addTo(map);


L.control.layers({
  "Google Map": GoogleStreets,
  "Imagery": Esri_WorldImagery,
  "Open Street Map": openstreetmap
}).addTo(map);

// ----------------- Globals -----------------
var amenityLayer;
var originalData;

// ----------------- Color Function -----------------
function getColor(type) {
  if (!type) return "#9b59b6";
  switch (type.toLowerCase()) {
    case "park": return "#2ecc71";
    case "hospital": return "#e74c3c";
    case "library": return "#f39c12";
    default: return "#9b59b6";
  }
}

// ----------------- Marker Style -----------------
function style_amenity(feature, latlng) {
  var t = feature.properties.Type || "";
  return L.circleMarker(latlng, {
    radius: 7,
    fillColor: getColor(t),
    color: '#333',
    weight: 1,
    opacity: 1,
    fillOpacity: 0.9
  });
}

// ----------------- Legend -----------------
var legend = L.control({ position: "bottomleft" });

legend.onAdd = function () {
  this._div = L.DomUtil.create("div", "leaflet-control legend");
  L.DomEvent.disableClickPropagation(this._div);
  this.update([]);
  return this._div;
};

legend.update = function (types) {
  var div = this._div;
  div.innerHTML = '<div class="legend-title">Legend</div>';
  if (!types || types.length === 0) {
    div.innerHTML += '<div>No features</div>';
    return;
  }
  types.forEach(function (t) {
    div.innerHTML +=
      '<div class="legend-item">' +
      '<span class="legend-symbol" style="background:' + getColor(t) + '"></span>' +
      '<span class="legend-label">' + t + '</span>' +
      '</div>';
  });
};

legend.addTo(map);

function updateLegendFromLayer(layer) {
  if (!layer || !layer.eachLayer) {
    legend.update([]);
    return;
  }
  var typesSet = new Set();
  layer.eachLayer(function (l) {
    if (l.feature && l.feature.properties && l.feature.properties.Type) {
      typesSet.add(l.feature.properties.Type);
    }
  });
  legend.update(Array.from(typesSet).sort());
}

// ----------------- Layer Creator -----------------
function createLayerFromData(fc, fitBounds) {
  if (amenityLayer) {
    map.removeLayer(amenityLayer);
  }

  amenityLayer = L.geoJSON(fc, {
    pointToLayer: style_amenity,
    onEachFeature: function (feature, layer) {
      var name = feature.properties.Name || "Unnamed";
      var type = feature.properties.Type || "Unknown";
      layer.bindPopup("<b>Name:</b> " + name + "<br><b>Type:</b> " + type);
    }
  }).addTo(map);

  updateLegendFromLayer(amenityLayer);

  if (fitBounds && amenityLayer.getLayers().length > 0) {
    map.fitBounds(amenityLayer.getBounds(), { padding: [20, 20] });
  }

  return amenityLayer;
}

// ----------------- Smart Search + Reset -----------------
function performSearchQuery(q) {
  if (!originalData) return;

  var query = (q || '').toString().trim().toLowerCase();

  // If empty, show all
  if (query === '') {
    createLayerFromData(originalData, true);
    return;
  }

  // Keyword mapping
  let keyword = null;
  if (query.includes("park")) keyword = "park";
  else if (query.includes("hospital")) keyword = "hospital";
  else if (query.includes("library")) keyword = "library";

  if (!keyword) {
    // No keyword found -> show nothing
    createLayerFromData({ type: "FeatureCollection", features: [] }, true);
    return;
  }

  // Filter features by Type
  var filtered = {
    type: "FeatureCollection",
    features: originalData.features.filter(f => {
      var t = f.properties.Type ? f.properties.Type.toLowerCase() : "";
      return t === keyword;
    })
  };

  createLayerFromData(filtered, true);
}

document.addEventListener("DOMContentLoaded", function () {
  var input = document.getElementById("searchInput");
  var btn = document.getElementById("searchBtn");
  var reset = document.getElementById("resetBtn");

  if (btn) btn.addEventListener("click", function () {
    performSearchQuery(input ? input.value : "");
  });

  if (input) input.addEventListener("keyup", function (e) {
    if (e.key === "Enter") {
      performSearchQuery(input.value);
    }
  });

  if (reset) reset.addEventListener("click", function () {
    if (input) input.value = "";
    createLayerFromData(originalData, true);
  });
});

// ----------------- Load GeoJSON -----------------
fetch("data/abu_dhabi_amenities.geojson")
  .then(res => res.json())
  .then(data => {
    originalData = data;
    createLayerFromData(originalData, true);
  })
  .catch(err => console.error("Failed to load GeoJSON:", err));