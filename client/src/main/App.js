import '../css/App.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';


function App() {


  const markers = [
    {
      geocode: [32.0860, 34.7825],
      popUp: "Place holder for locations"
    },
    {
      geocode: [32.0847, 34.7805],
      popUp: "Place holder for locations"
    },
    {
      geocode: [32.0858, 34.7798],
      popUp: "Place holder for locations"
    }
  ]

  const customIcon = new Icon({
    iconUrl: require("../icons/destination.png"),
    iconSize: [36,36]
  })

  return (
    <MapContainer center={[32.0853, 34.7818]} zoom={13}>
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>  | <a href="https://www.flaticon.com/free-icons/destination" title="destination icons">Destination icons created by Flat Icons - Flaticon</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[32.0853, 34.7818]}>
        <Popup>
          Tel Aviv <br /> Nice place!
        </Popup>
      </Marker>
      {markers.map(marker => (
        <Marker position={marker.geocode} icon={customIcon}>
          <Popup>{marker.popUp}</Popup>
        </Marker>
      ))}
    </MapContainer>
    
  );
}

export default App;
