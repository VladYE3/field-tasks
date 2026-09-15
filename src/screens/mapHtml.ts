export const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="anonymous" />
  <style>
    html, body, #map {
      height: 100%;
      margin: 0;
      padding: 0;
      background: #eef2f5;
      overflow: hidden;
      font-family: sans-serif;
    }

    .task-marker {
      align-items: center;
      background: #1f6feb;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      color: #fff;
      display: flex;
      font-size: 13px;
      font-weight: 700;
      height: 30px;
      justify-content: center;
      width: 30px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin="anonymous"></script>
  <script>
    (function () {
      function report(type, message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, message: message || '' }));
        }
      }

      if (!window.L) {
        report('map-error', 'Leaflet could not be loaded. Check the phone internet connection.');
        return;
      }

      var leafletMap = L.map('map', { zoomControl: true });
      var markersLayer = L.layerGroup().addTo(leafletMap);
      var pendingTasks = [];

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletMap);

      function clean(value) {
        return String(value || '').replace(/[<>&\"']/g, '');
      }

      function renderTasks(tasks) {
        pendingTasks = Array.isArray(tasks) ? tasks : [];
        markersLayer.clearLayers();
        var validTasks = pendingTasks.filter(function (task) {
          return Number.isFinite(Number(task.latitude)) && Number.isFinite(Number(task.longitude));
        });
        if (validTasks.length === 0) return;

        var bounds = [];
        validTasks.forEach(function (task, index) {
          var latitude = Number(task.latitude);
          var longitude = Number(task.longitude);
          var marker = L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: '',
              html: '<div class="task-marker">' + (index + 1) + '</div>',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })
          }).addTo(markersLayer);
          marker.bindPopup('<strong>' + clean(task.title || 'Task') + '</strong><br>' + clean(task.address));
          marker.bindTooltip((index + 1) + '. ' + clean(task.title || task.address), {
            permanent: true,
            direction: 'top',
            offset: [0, -14]
          });
          marker.on('click', function () {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select-task', taskId: task.id }));
            }
          });
          bounds.push([latitude, longitude]);
        });
        leafletMap.fitBounds(bounds, { padding: [24, 24], maxZoom: validTasks.length === 1 ? 14 : 16 });
      }

      window.setTasks = renderTasks;
      window.addEventListener('resize', function () {
        leafletMap.invalidateSize();
        renderTasks(pendingTasks);
      });
      setTimeout(function () {
        leafletMap.invalidateSize();
        renderTasks(pendingTasks);
      }, 250);
      report('map-ready');
    }());
  </script>
</body>
</html>`;
