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

// promised version of image.onload()
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
  function makeOverlay(leafletMap, toOverlay, imgHeight, imgWidth) {
    const mapPixelWidth = leafletMap.getSize().x;
    const mapPixelHeight = leafletMap.getSize().y;
    var bottomRight, bottomLeft, topLeft, topRight;
    if ((imgHeight / imgWidth) > (mapPixelHeight / mapPixelWidth)) {
      // image is more vertical than map view
      const width = mapPixelHeight * imgWidth / imgHeight * 0.9;
      const widthOffset = (mapPixelWidth - width) / 2;
      const height = mapPixelHeight * 0.9
      const heightOffset = mapPixelHeight * 0.05;
      bottomRight = leafletMap.containerPointToLatLng([width + widthOffset, height + heightOffset]);
      bottomLeft = leafletMap.containerPointToLatLng([widthOffset, height + heightOffset]);
      topRight = leafletMap.containerPointToLatLng([width + widthOffset, heightOffset]);
      topLeft = leafletMap.containerPointToLatLng([widthOffset, heightOffset]);
    } else {
      // map view is more vertical than image
      const width = mapPixelWidth * 0.9;
      const widthOffset = mapPixelWidth * 0.05;
      const height = mapPixelWidth * imgHeight / imgWidth * 0.9
      const heightOffset = (mapPixelHeight - height) / 2;
      bottomRight = leafletMap.containerPointToLatLng([width + widthOffset, height + heightOffset]);
      bottomLeft = leafletMap.containerPointToLatLng([widthOffset, height + heightOffset]);
      topRight = leafletMap.containerPointToLatLng([width + widthOffset, heightOffset]);
      topLeft = leafletMap.containerPointToLatLng([widthOffset, heightOffset]);
    }
    var overlay = L.imageOverlay.rotated(toOverlay, topLeft, topRight, bottomLeft, { interactive: true });
    overlay.addTo(leafletMap);
    var poly = new L.Polygon([bottomLeft, topLeft, topRight, bottomRight], {
      draggable: true,
      opacity: 0,
      fillOpacity: 0
    }).addTo(leafletMap);
    poly.on('drag', function (e) {
      const coords = poly.dragging._transformPoints(this.dragging._matrix, {})[0]
      overlay.reposition(coords[1], coords[2], coords[0]);
    });
    return overlay
  }

  const canvas = document.getElementById('overlay-canvas');
  const context = canvas.getContext('2d');
  var overlayPromise;

  if (isPdfFile(mapUrl)) {
    overlayPromise = pdfjsLib.getDocument(mapUrl).promise.then(function (pdf) {
      var pageNum = 1;
      if (pdf.numPages > 1) {
        pageNum = parseInt(window.prompt('Which page of the PDF should be used?'));
        while (isNaN(pageNum)) {
          pageNum = parseInt(window.prompt("Sorry, I require a number.\nWhich page of the PDF should be used?"));
        }
      }
      return pdf.getPage(pageNum).then(function (page) {
        var scale = 2;
        var viewport = page.getViewport({ scale: scale });

        // Prepare canvas using PDF page dimensions

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page into canvas context
        var renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        return page.render(renderContext).promise.then(function () {
          return makeOverlay(leafletMap, canvas, viewport.height, viewport.width)
        });
      })
    });
  } else {
    overlayPromise = loadImage(mapUrl).then(
      function (img) {
        canvas.height = img.naturalHeight;
        canvas.width = img.naturalWidth;
        context.drawImage(img, 0, 0);
        return makeOverlay(leafletMap, canvas, img.naturalHeight, img.naturalWidth);
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
    value: 0.5,
    showValue: false,
    increment: true,
    size: '150px',
    orientation: 'vertical',
    collapsed: false,
    syncSlider: true,
    id: 'Opacity'
  })
  opacitySlider.addTo(leafletMap);

  leafletMap.on('click', (e) => { overlayPromise.then((ov) => { console.log(ov); }) })

  return overlayPromise
}

function main() {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  initMap();
}
document.addEventListener("DOMContentLoaded", function (event) {
  main()
});
