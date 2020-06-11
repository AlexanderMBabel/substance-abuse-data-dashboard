import './styles/app.css';
import * as d3 from 'd3';
import drugData from './drugs.csv';
import * as topojson from 'topojson';
const mapUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

let year = 2002;
let ageGroup = 12;
let substance = 'Tobacco';

function dataMap(mapData, drugData, year, age, substance) {
  let width = 550;
  let height = 350;
  let yearData = drugData.filter((data) => data.Year === year);
  let geoData = topojson.feature(mapData, mapData.objects.states).features;
  let projection = d3
    .geoAlbersUsa()
    .scale(width)
    .translate([width / 2, height / 2]);
  let path = d3.geoPath(projection);
  let stat = `${substance}${age}`;
  console.log(stat);
  let mergedData = mergeDatasets(geoData, yearData);
  debugger;
  let scale = d3
    .scaleLinear()
    .domain([0, d3.max(yearData, (d) => d[stat])])
    .range(['#3d677b', '#9a4832']);
  let svg = d3
    .select('.mapSvg')
    .attr('width', width)
    .attr('height', height)
    .selectAll('.state')
    .data(mergedData);

  svg
    .enter()
    .append('path')
    .classed('state', true)
    .merge(svg)
    .transition()
    .duration(500)
    .ease(d3.easeCircle)
    .attr('d', path)
    .attr('fill', (d) =>
      d.properties.data ? scale(d.properties.data[stat]) : '#cccccc'
    );
}

function pieChart(drugData, year, age) {
  yearData = drugData.filter((data) => data.Year === year);
  let substances = createSliceArray(age);

  colorScale = d3.ordinalScale();
}

function createSliceArray(age) {
  let substances = ['Alcohol', 'Cannabis', 'Illicit', 'Painkiller', 'Tobacco'];
  return substances.map((substance) => substance + age);
}

function mergeDatasets(d1, d2) {
  d1.forEach((state, i) => {
    d2.forEach((data) => {
      if (state.properties.name === data.State) {
        d1[i].properties.data = data;
      }
    });
  });
  return d1;
}

d3.json(mapUrl).then((data) => {
  dataMap(data, drugData, year, ageGroup, substance);

  d3.select('#year-select').on('change', () => {
    year = Number(d3.event.target.value);
    dataMap(data, drugData, year, ageGroup, substance);
  });

  d3.select('#age-select').on('change', () => {
    ageGroup = d3.event.target.value;
    dataMap(data, drugData, year, ageGroup, substance);
  });
  d3.select('#substance-select').on('change', () => {
    substance = d3.event.target.value;
    dataMap(data, drugData, year, ageGroup, substance);
  });
});
