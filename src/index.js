import './styles/app.css';
import * as d3 from 'd3';
import drugData from './drugs.csv';
import * as topojson from 'topojson';
const mapUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

let year = 2002;
let ageGroup = 12;
let substance = 'Tobacco';
let state = 'Alabama';
let substances = ['Alcohol', 'Cannabis', 'Illicit', 'Painkiller', 'Tobacco'];

function dataMap(mapData, drugData, year, age, substance) {
  let width = 800;
  let height = 375;
  let yearData = drugData.filter((data) => data.Year === year);
  // Convert topojson to geojson
  let geoData = topojson.feature(mapData, mapData.objects.states).features;
  //  Create a projection of map data using albers' algorithm
  let projection = d3
    .geoAlbersUsa()
    .scale(width)
    .translate([width / 2, height / 2]);

  // Create path data for states
  let path = d3.geoPath(projection);
  let stat = `${substance}${age}`;

  //  Merge data with state path data
  let mergedData = mergeDatasets(geoData, yearData);

  //  create color scale for color gradients
  let scale = d3
    .scaleLinear()
    .domain([0, d3.max(yearData, (d) => d[stat])])
    .range(['#3d677b', '#9a4832']);

  // select size and add data to the svg element
  let svg = d3
    .select('.mapSvg')
    .attr('width', width)
    .attr('height', height)
    .selectAll('.state')
    .data(mergedData);

  //  Draw the map
  svg
    .enter()
    .append('path')
    .classed('state', true)
    .merge(svg)
    .on('click', (d) => {
      state = d.properties.name;
      console.log(state);
      updateLineChart(drugData, state, ageGroup);
    })
    .transition()
    .duration(500)
    .ease(d3.easeCircle)
    .attr('d', path)
    .attr('fill', (d) =>
      d.properties.data ? scale(d.properties.data[stat]) : '#cccccc'
    );
}

// draw and update the pie chart
function pieChart(drugData, year, age) {
  let width = 300;
  let height = 300;
  let yearData = drugData.filter((data) => data.Year === year);
  let substances = createSliceArray(age);
  let totals = createTotalArray(yearData, substances);
  let colors = ['#414141', '#6b7478', '#cf7478', '#7c8e51', '#384d47'];

  let colorScale = d3.scaleOrdinal().domain(substances).range(colors);

  // creat the arcs
  let arcs = d3.pie().value((d) => d)(totals);

  // Create the paths
  let path = d3
    .arc()
    .outerRadius(width / 2)
    .innerRadius(0);

  //  Select the svg and size it
  let svg = d3.select('.pieSvg').attr('width', width).attr('height', height);

  ///  Create a group classed circle to position the pie chart in the svg
  svg
    .append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`)
    .classed('circle', true);

  let circle = d3.select('.circle').selectAll('.arc').data(arcs);

  // Draw pie chart
  circle
    .enter()
    .append('path')
    .classed('arc', true)
    .attr('fill', (d) => colorScale(d.data))
    .attr('stroke', '#ccc')
    .merge(circle)
    .attr('d', path);
}

function lineChart(drugData, state, age) {
  let margin = { top: 10, right: 100, bottom: 50, left: 80 };
  let width = 900 - margin.left - margin.right;
  let height = 350 - margin.top - margin.bottom;
  let dates = getDates();
  let stats = createSliceArray(age);
  let filteredData = filterDrugData(drugData, stats, state);

  // select the svg with class .lineSvg
  // add a group with class lineGraph
  //position the group
  let svg = d3
    .select('.lineSvg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .classed('lineGraph', true)
    .attr('transform', `translate( ${margin.left}, ${margin.top})`);

  // Create and draw  x axis
  let xAxis = d3.scaleLinear().domain(d3.extent(dates)).range([0, width]);
  svg
    .append('g')
    .classed('axis', true)
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xAxis).tickFormat((d) => d.toString()))
    .append('text')
    .attr('dx', 10)
    .attr('x', width / 2)
    .attr('y', 35)
    .style('text-anchor', 'middle')
    .text('Year');

  //  Create and draw y axis
  let yAxis = d3
    .scaleLinear()
    .domain([0, d3.max(getAllValues(filteredData))])
    .range([height, 0]);
  svg
    .append('g')
    .classed('y-axis', true)
    .classed('axis', true)
    .call(d3.axisLeft(yAxis))
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('dy', '.71em')
    .attr('y', 6)
    .style('text-anchor', 'end')
    .text('Rate');

  //  create line
  const line = d3
    .line()
    .x((d) => xAxis(d.year))
    .y((d) => yAxis(d.value));

  // add numbered id to line classes to differenciate them for css styling
  let id = 0;
  const ids = () => 'line-' + id++;

  let lines = svg
    .selectAll('.line')
    .data(filteredData.map((data) => data.values));

  //  Draw lines
  lines
    .enter()
    .append('path')
    .attr('class', ids)
    .classed('line', true)
    .attr('d', (d) => line(d));

  //  Draw Labels
  lines
    .data(filteredData)
    .enter()
    .append('text')
    .classed('line-label', true)
    .text((d) => d.values[id].name)
    .datum(function (d) {
      return {
        value: d.values[d.values.length - 1],
      };
    })
    .attr('transform', function (d) {
      return (
        'translate(' +
        (xAxis(d.value.year) + 10) +
        ',' +
        (yAxis(d.value.value) + 5) +
        ')'
      );
    })
    .attr('x', 5);
}

//  Update line chart
function updateLineChart(drugData, state, age) {
  let margin = { top: 10, right: 100, bottom: 50, left: 80 };
  let width = 900 - margin.left - margin.right;
  let height = 350 - margin.top - margin.bottom;
  let stats = createSliceArray(age);
  let filteredData = filterDrugData(drugData, stats, state);
  let dates = getDates();
  // create x axis scale
  let xAxis = d3.scaleLinear().domain(d3.extent(dates)).range([0, width]);
  // create y axis scale
  let yAxis = d3
    .scaleLinear()
    .domain([0, d3.max(getAllValues(filteredData))])
    .range([height, 0]);

  // creates scaled points for graph
  const line = d3
    .line()
    .x((d) => xAxis(d.year))
    .y((d) => yAxis(d.value));

  let svg = d3.select('body');

  //  Update the lines
  svg
    .selectAll('.line')
    .data(filteredData)
    .transition()
    .duration(500)
    .ease(d3.easeElastic)
    .attr('d', (d) => line(d.values));

  //  Update the labels
  svg
    .selectAll('.line-label')
    .data(filteredData)
    .datum(function (d) {
      return {
        value: d.values[d.values.length - 1],
      };
    })
    .attr('transform', function (d) {
      return (
        'translate(' +
        (xAxis(d.value.year) + 10) +
        ',' +
        (yAxis(d.value.value) + 5) +
        ')'
      );
    })
    .attr('x', 5);

  //  Update the y-axis tick amounts
  svg.select('.y-axis').transition().duration(500).call(d3.axisLeft(yAxis));
}

// Create an array of all value in the data given
function getAllValues(data) {
  let values = [];
  data.forEach((d) => {
    d.values.forEach((val) => {
      values.push(val.value);
    });
  });
  return values;
}

//  Not yet used
function histogramChart(state, substance, age) {
  let width = 400,
    height = 200,
    barPadding = 1;
  // console.log(drugData.filter((data) => data.State === state));
  let stateData = drugData.filter((data) => data.State === state);
  console.log(stateData);
  let stat = substance + age;

  // Scales
  let xScale = d3
    .scaleLinear()
    .domain(d3.extent(stateData, (d) => d[stat]))
    .range([0, width]);

  let histogramData = d3
    .histogram()
    .domain(xScale.domain())
    .thresholds(10)
    .value((d) => d[stat]);

  let bins = histogramData(stateData);

  console.log(bins);

  let yScale = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length)])
    .range([height, 0]);

  let colorScale = d3.scaleOrdinal().domain(bins).range(d3.schemeCategory10);

  let bars = d3
    .select('.histSvg')
    .attr('width', width)
    .attr('height', height)
    .selectAll('.bar')
    .data(bins);

  bars.exit().remove();
  bars
    .enter()
    .append('g')
    .classed('bar', true)

    .append('rect')

    .attr('x', (d) => xScale(d.x0))
    .attr('y', (d) => yScale(d.length))
    // .merge(bars)
    .attr('height', (d) => height - yScale(d.length))
    .attr('width', (d) => xScale(d.x1) - xScale(d.x0) - barPadding)
    .attr('fill', (d) => colorScale(d.x0));
}

//  Not yet used
function barChart(drugData, state, substance, age) {
  width = 900;
  height = 400;
}
//  create an array of all unique years
function getDates() {
  let dates = drugData.map((d) => d.Year);
  let datesSet = new Set(dates);
  return Array.from(datesSet);
}

//  filter data into an array of objects each representing a substanceand age group  each object has a value key
//  with an array of values represnting rates of abuse for each year
function filterDrugData(drugData, stats, state) {
  let statsWithYear = [...stats];
  statsWithYear.push('Year', 'State');

  let filteredData = [];
  drugData.forEach((d) => {
    let newData = {};
    statsWithYear.forEach((stat) => {
      newData[stat] = d[stat];
    });
    filteredData.push(newData);
  });
  let lines = [];
  filteredData = filteredData.filter((d) => d.State === state);
  stats.forEach((stat) => {
    let line = {};
    line.values = [];
    line.name = stat;

    filteredData.forEach((d) => {
      line.values = [
        ...line.values,
        { year: d.Year, value: d[stat], name: stat },
      ];
    });
    lines.push(line);
  });

  return lines;
}

//  Create array of subatances appended with ageGroup
function createSliceArray(age) {
  return substances.map((substance) => substance + age);
}

// Create an array of all of total of all values for a substance in an age group
function createTotalArray(yearData, substances) {
  let totals = [];

  substances.forEach((substance) => {
    let total = yearData.reduce((acc, next) => acc + next[substance], 0);
    totals.push(total);
  });
  return totals;
}

//  Merge Geo data and dataset into one array of objects
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

//  Parse mapdata from cdn and make all nessicary funciton calls to draw and update graphs
d3.json(mapUrl).then((data) => {
  dataMap(data, drugData, year, ageGroup, substance);
  pieChart(drugData, year, ageGroup);
  lineChart(drugData, state, ageGroup);

  d3.select('#year-select').on('change', () => {
    year = Number(d3.event.target.value);
    dataMap(data, drugData, year, ageGroup, substance);
    pieChart(drugData, year, ageGroup);
  });

  d3.select('#age-select').on('change', () => {
    ageGroup = d3.event.target.value;
    dataMap(data, drugData, year, ageGroup, substance);
    pieChart(drugData, year, ageGroup);
    updateLineChart(drugData, state, ageGroup);
  });
  d3.select('#substance-select').on('change', () => {
    substance = d3.event.target.value;
    dataMap(data, drugData, year, ageGroup, substance);
    histogramChart(state, substance, ageGroup);
  });
});
