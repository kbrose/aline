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

  // Link input
  L.control.custom({
    position: 'topright',
    content: '' +
      '<div class="input-group">' +
      '    <input id="link-input" type="text" class="text-input" placeholder="Link to image or PDF">' +
      '    <button id="link-input-go" class="text-input-btn"" type="button">Go!</button>' +
      '</div>',
    classes: '',
  }).addTo(map);
  document.getElementById('link-input').focus();
  document.getElementById('link-input-go').addEventListener('click', () => { overlayButton(map) });
  document.onkeydown = function (e) {
    e = e || window.event;
    e.code
    switch (e.code) {
      case "Enter":
        overlayButton(map);
        break;
    }
  }

  return map
}

function setOverlayOpacity(alpha) {
  document.getElementById('overlay-canvas').getContext("2d").globalAlpha = alpha;
}

function overlayButton(map) {
  const link = document.getElementById('link-input').value
  if (link.length === 0) {
    alert("Please copy/paste a link first")
    return
  }
  // overlayMap(link, map);
  try {
    overlayMap(link, map)
  } catch (error) {
    alert(`Problem overlaying ${link}:\n${error}`)
  }
}

function isPdfFile(url) {
  url = url.split('?')[0].toLowerCase();  // strip query parameters
  if (url.endsWith('.pdf')) {
    return true
  }
  return false
}

function loadImage(url) {
  return new Promise(resolve => {
    const image = new Image();
    image.addEventListener('load', () => {
      resolve(image);
    });
    image.src = url;
  });
}

function overlayMap(mapUrl, leafletMap) {
  var topLeft = [44.890444, -87.441707];
  var topRight = [44.890495, -87.384767];
  var bottomLeft = [44.840871, -87.432472];

  function makeOverlay(toOverlay) {
    var overlay = L.imageOverlay.rotated(toOverlay, topLeft, topRight, bottomLeft, { opacity: 0.5 })
    overlay.addTo(leafletMap);
    return overlay
  }

  const canvas = document.getElementById('overlay-canvas');
  const context = canvas.getContext('2d');
  var overlayPromise;

  if (isPdfFile(mapUrl)) {
    overlayPromise = pdfjsLib.getDocument(mapUrl).promise.then(function (pdf) {
      return pdf.getPage(1).then(function (page) {
        var scale = 1.5;
        var viewport = page.getViewport({ scale: scale });

        // Prepare canvas using PDF page dimensions

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
    overlayPromise = loadImage(mapUrl).then(
      function (img) {
        context.drawImage(img, 0, 0);
        return makeOverlay(canvas);
      }
    );
  }

  // Opacity control
  var opacitySlider = L.control.slider(
    (opacity) => {
      overlayPromise.then((overlay) => { overlay.setOpacity(opacity); });
    }, {
    min: 0,
    max: 1,
    step: 0.1,
    value: 50,
    showValue: false,
    increment: true,
    size: '150px',
    orientation: 'vertical',
    collapsed: false,
    syncSlider: true,
    id: 'Opacity'
  })
  opacitySlider.addTo(leafletMap);

  return overlayPromise
}

function main() {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';
  var map = initMap();
  map.on('click', (e) => { console.log(overlayPromise); })
}
document.addEventListener("DOMContentLoaded", function (event) {
  main()
});
