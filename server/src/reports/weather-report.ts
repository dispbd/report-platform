import path from 'node:path'
import ExcelJS from 'exceljs'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config/index.js'
import logger from '../logger/index.js'
import type { ReportDefinition } from './base.js'
import type { GenerationResult } from '../types/index.js'
import { stat } from 'node:fs/promises'

// ============================================================
// Weather Summary Report (XLSX)
// ============================================================
// Data source: Open-Meteo public API (no key required)
// Fetches current weather for a list of cities and outputs XLSX.
// ============================================================

interface CityWeather {
  city: string
  latitude: number
  longitude: number
  temperature: number
  windSpeed: number
  humidity: number
  description: string
}

const DEFAULT_CITIES = [
  { name: 'Москва', lat: 55.7558, lon: 37.6173 },
  { name: 'Санкт-Петербург', lat: 59.9343, lon: 30.3351 },
  { name: 'Новосибирск', lat: 55.0084, lon: 82.9357 },
  { name: 'Екатеринбург', lat: 56.8389, lon: 60.6057 },
  { name: 'Казань', lat: 55.7887, lon: 49.1221 },
  { name: 'Лондон', lat: 51.5074, lon: -0.1278 },
  { name: 'Нью-Йорк', lat: 40.7128, lon: -74.006 },
  { name: 'Токио', lat: 35.6762, lon: 139.6503 },
]

// WMO weather code → human-readable description
function wmoCodeToDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Ясно',
    1: 'Преимущественно ясно',
    2: 'Переменная облачность',
    3: 'Пасмурно',
    45: 'Туман',
    48: 'Изморозь',
    51: 'Лёгкая морось',
    53: 'Умеренная морось',
    55: 'Сильная морось',
    61: 'Небольшой дождь',
    63: 'Умеренный дождь',
    65: 'Сильный дождь',
    71: 'Небольшой снег',
    73: 'Умеренный снег',
    75: 'Сильный снег',
    80: 'Ливень',
    95: 'Гроза',
  }
  return descriptions[code] ?? `Код ${code}`
}

async function fetchWeatherForCity(
  city: { name: string; lat: number; lon: number },
): Promise<CityWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Open-Meteo API error for ${city.name}: ${response.status}`)
  }
  const data = (await response.json()) as {
    current: {
      temperature_2m: number
      wind_speed_10m: number
      relative_humidity_2m: number
      weather_code: number
    }
  }

  return {
    city: city.name,
    latitude: city.lat,
    longitude: city.lon,
    temperature: data.current.temperature_2m,
    windSpeed: data.current.wind_speed_10m,
    humidity: data.current.relative_humidity_2m,
    description: wmoCodeToDescription(data.current.weather_code),
  }
}

export const weatherReport: ReportDefinition = {
  id: 'weather-summary',
  name: 'Сводка погоды',
  description: 'Текущая погода по выбранным городам. Данные: Open-Meteo API.',
  supportedFormats: ['xlsx'],
  parameters: [
    {
      name: 'cities',
      label: 'Города (через запятую, пусто = все по умолчанию)',
      type: 'string',
      required: false,
      default: '',
    },
  ],

  async generate(params, format): Promise<GenerationResult> {
    if (format !== 'xlsx') {
      throw new Error(`Weather report does not support format: ${format}`)
    }

    // Parse city filter
    const citiesParam = (params.cities as string)?.trim()
    let cities = DEFAULT_CITIES
    if (citiesParam) {
      const requested = citiesParam.split(',').map((c) => c.trim().toLowerCase())
      cities = DEFAULT_CITIES.filter((c) => requested.includes(c.name.toLowerCase()))
      if (cities.length === 0) cities = DEFAULT_CITIES
    }

    // Fetch weather data
    logger.info({ cities: cities.map((c) => c.name) }, 'Fetching weather data')
    const weatherData = await Promise.all(cities.map(fetchWeatherForCity))

    // Generate XLSX
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Report Platform'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('Погода')

    sheet.columns = [
      { header: 'Город', key: 'city', width: 20 },
      { header: 'Температура (°C)', key: 'temperature', width: 18 },
      { header: 'Влажность (%)', key: 'humidity', width: 15 },
      { header: 'Ветер (км/ч)', key: 'windSpeed', width: 15 },
      { header: 'Описание', key: 'description', width: 25 },
      { header: 'Широта', key: 'latitude', width: 12 },
      { header: 'Долгота', key: 'longitude', width: 12 },
    ]

    // Style header row
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    }
    headerRow.alignment = { horizontal: 'center' }

    // Add data rows
    for (const w of weatherData) {
      sheet.addRow(w)
    }

    // Auto-filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: weatherData.length + 1, column: 7 },
    }

    // Write file
    const fileName = `weather-summary-${new Date().toISOString().slice(0, 10)}.xlsx`
    const filePath = path.join(config.TEMP_DIR, `${uuidv4()}-${fileName}`)
    await workbook.xlsx.writeFile(filePath)

    const stats = await stat(filePath)

    return {
      filePath,
      fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileSize: stats.size,
    }
  },
}
