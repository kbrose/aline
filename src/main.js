function initMap() {
  // Set up tiles
  var x = "sq1rs5228q8o47979o93ps21pon602os"
  x = x.replace(/[a-zA-Z]/g, function (c) { return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26); })
  var map = L.map('map');
  L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${x}`, {
    attribution: 'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © OpenStreetMap <a href="https://www.openstreetmap.org/copyright" target="_blank">contributors</a>',
    maxZoom: 20,
    id: 'osm-bright'
  }).addTo(map);

  // Geolocate
  function onLocationFound(e) {
    L.circleMarker(e.latlng, { radius: 5, stroke: false, fillOpacity: 1.0 }).addTo(map);
  }
  function onLocationError(e) {
    alert("Unable to get your location. Make sure it is enabled in your settings.");
  }
  map.on('locationfound', onLocationFound);
  map.on('locationerror', onLocationError);
  map.locate({ setView: true, maxZoom: 15 });

  // Overlay button
  function overlayPdf(button, map) {
    alert('Map is centered at: ' + map.getCenter().toString());
  }
  L.easyButton({
    id: 'pdf-overlay',
    position: 'topright',
    type: 'replace',
    leafletClasses: true,
    states: [{
      stateName: 'overlay-pdf',
      onClick: overlayPdf,
      title: 'overlay another map onto this map',
      icon: '<h3>Overlay a map</h3>'
    }]
  }).addTo(map);

  return map
}

function isPdfFile(url) {
  url = url.split('?')[0].toLowerCase();  // strip query parameters
  if (url.endsWith('.pdf')) {
    return true
  }
  return false
}

function overlayMap(mapUrl, leafletMap) {
  var topLeft = [43.07755, -89.3429];
  var topRight = [43.095907, -89.3429];
  var bottomLeft = [43.07755, -89.382812];

  function makeOverlay(toOverlay) {
    var overlay = L.imageOverlay.rotated(toOverlay, topLeft, topRight, bottomLeft, { opacity: 0.5 })
    overlay.addTo(leafletMap);
    return overlay
  }

  if (isPdfFile(mapUrl)) {
    return pdfjsLib.getDocument(mapUrl).promise.then(function (pdf) {
      return pdf.getPage(1).then(function (page) {
        var scale = 1.5;
        var viewport = page.getViewport({ scale: scale });

        // Prepare canvas using PDF page dimensions
        var canvas = document.getElementById('pdf-canvas');
        var context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        var renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        var renderTask = page.render(renderContext);
        return renderTask.promise.then(function () {
          return makeOverlay(canvas)
        });
      })
    });
  } else {
    return Promise.resolve(makeOverlay(mapUrl));
  }
}


function main() {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';
  var map = initMap();

  // const mapUrl = "https://dnr.wisconsin.gov/sites/default/files/hero-images/Parks_Hero%20Image_Gov%20Nelson.jpg";
  const mapUrl = "https://cf-store.widencdn.net/widnr/c/0/f/c0fdaa05-e6fc-436d-875d-56f36ace5d1e.pdf?response-content-disposition=inline%3B%20filename%3D%22Governor-Nelson_Summer-Map.pdf%22&response-content-type=application%2Fpdf&Expires=1620105781&Signature=KQEr1bA87dyqiL6AixJiBvF87C5aJo1aBuzKSgkxNG5FsHQW07q7Rit1YNm2~~pqJJ8EWShDFX5whciPxrd1ILIC83Qry5oE4nukT5~yqphMx14eI2i-mGnrAtt1ioJ3zVlThFcEXciFx6aUGVGQ4dv8ffzADLHAlNEj-ZqtDGCkAFYWgbJZxInzrx5r49~-we8f1e1GpFTkEFVlf2j8BUQ-9nXwwvidukpsjwmVadNTiM3QuRwf-9vPXQJi5F1m24fSHi2rSnyFDaLtRTx88LoxtD~R5-r1s86LTLxGgdL7F9ZQlCptIfz7NtEHkhc0qDXtryjSIOCOL0kl863JTQ__&Key-Pair-Id=APKAJD5XONOBVWWOA65A";
  var overlayPromise = overlayMap(mapUrl, map);

  function onMapClick(e) {
    console.log(overlayPromise)
  }
  map.on('click', onMapClick);
}

main()
