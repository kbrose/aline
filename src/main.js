function initMap() {
  var x = "sq1rs5228q8o47979o93ps21pon602os"
  x = x.replace(/[a-zA-Z]/g, function (c) { return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26); })
  var map = L.map('mapid');
  L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${x}`, {
    attribution: 'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © OpenStreetMap <a href="https://www.openstreetmap.org/copyright" target="_blank">contributors</a>',
    maxZoom: 20,
    id: 'osm-bright'
  }).addTo(map);
  return map
}

function mapClickCallback(map, popup) {
  function onMapClick(e) {
    popup
      .setLatLng(e.latlng)
      .setContent("You clicked the map at " + e.latlng.toString())
      .openOn(map);
  }
  return onMapClick
}

function locationCallbacks(map) {
  function onLocationFound(e) {
    L.circleMarker(e.latlng, { radius: 5, stroke: false, fillOpacity: 1.0 }).addTo(map);
  }
  function onLocationError(e) {
    alert("Unable to get your location. Make sure it is enabled in your settings.");
  }
  return { onLocationFound, onLocationError }
}


function main() {
  var map = initMap();
  var popup = L.popup();
  map.on('click', mapClickCallback(map, popup));
  var { onLocationFound, onLocationError } = locationCallbacks(map);
  map.on('locationfound', onLocationFound);
  map.on('locationerror', onLocationError);
  map.locate({ setView: true, maxZoom: 15 });

  // const imageUrl = "https://dnr.wisconsin.gov/sites/default/files/hero-images/Parks_Hero%20Image_Gov%20Nelson.jpg";
  const imageUrl = "https://embed.widencdn.net/pdf/download/widnr/pvlzw9l59s/Governor-Nelson_Summer-Map.pdf";
  var imageBounds = [[43.1238, -89.4420], [43.1466, -89.4257]];
  L.imageOverlay(imageUrl, imageBounds, { opacity: 0.5 }).addTo(map);

}

main()
