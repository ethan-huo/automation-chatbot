import { sample } from 'lodash-es'

export const regions = [
  // 🇺🇸 美国地区
  { id: 'us-east5', name: 'Columbus, Ohio' },
  { id: 'us-south1', name: 'Dallas, Texas' },
  { id: 'us-central1', name: 'Iowa' },
  { id: 'us-west4', name: 'Las Vegas, Nevada' },
  {
    id: 'us-east1',
    name: 'Moncks Corner, South Carolina',
  },
  { id: 'us-east4', name: 'Northern Virginia' },
  { id: 'us-west1', name: 'Oregon' },
  { id: 'us-west2', name: 'Los Angeles, California' },
  { id: 'us-west3', name: 'Salt Lake City, Utah' },

  // 🇨🇦 加拿大地区
  {
    id: 'northamerica-northeast1',
    name: 'Montréal, Canada',
  },
  {
    id: 'northamerica-northeast2',
    name: 'Toronto, Canada',
  },

  // 🌎 南美洲地区
  { id: 'southamerica-west1', name: 'Santiago, Chile' },
  {
    id: 'southamerica-east1',
    name: 'São Paulo, Brazil',
  },

  // 🌍 非洲地区
  {
    id: 'africa-south1',
    name: 'Johannesburg, South Africa',
  },

  // 🇪🇺 欧洲地区
  { id: 'europe-west1', name: 'Belgium' },
  { id: 'europe-north1', name: 'Finland' },
  { id: 'europe-west3', name: 'Frankfurt, Germany' },
  {
    id: 'europe-west2',
    name: 'London, United Kingdom',
  },
  { id: 'europe-southwest1', name: 'Madrid, Spain' },
  { id: 'europe-west8', name: 'Milan, Italy' },
  { id: 'europe-west4', name: 'Netherlands' },
  { id: 'europe-west9', name: 'Paris, France' },
  { id: 'europe-west12', name: 'Turin, Italy' },
  { id: 'europe-central2', name: 'Warsaw, Poland' },
  { id: 'europe-west6', name: 'Zürich, Switzerland' },

  // 🌏 亚太地区
  { id: 'asia-east2', name: 'Hong Kong, China' },
  { id: 'asia-southeast2', name: 'Jakarta, Indonesia' },
  {
    id: 'australia-southeast2',
    name: 'Melbourne, Australia',
  },
  { id: 'asia-south1', name: 'Mumbai, India' },
  { id: 'asia-northeast2', name: 'Osaka, Japan' },
  { id: 'asia-northeast3', name: 'Seoul, Korea' },
  { id: 'asia-southeast1', name: 'Singapore' },
  {
    id: 'australia-southeast1',
    name: 'Sydney, Australia',
  },
  { id: 'asia-east1', name: 'Taiwan' },
  { id: 'asia-northeast1', name: 'Tokyo, Japan' },

  // 🏜️ 中东地区
  { id: 'me-central2', name: 'Dammam, Saudi Arabia' },
  { id: 'me-central1', name: 'Doha, Qatar' },
  { id: 'me-west1', name: 'Tel Aviv, Israel' },
]

export const getRandomVertexRegion = () => {
  const region = sample(regions)!
  console.log('Hit region:', region.name)
  return region
}
