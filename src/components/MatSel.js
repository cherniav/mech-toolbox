import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import Select from 'react-select';
import csvFile from '../data/matDb.csv';
import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

const MatSel = () => {
  const [csvData, setCsvData] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [materialTypeColumn, setMaterialTypeColumn] = useState('');
  const [units, setUnits] = useState({});
  const [simplifiedHeaders, setSimplifiedHeaders] = useState({});

  useEffect(() => {
    Papa.parse(csvFile, {
      complete: (result) => {
        console.log('Parsed CSV data:', result.data); // Debugging
        setCsvData(result.data);
        
        const headers = Object.keys(result.data[0] || {});
        console.log('CSV headers:', headers); // Debugging

        const materialTypeCol = headers.find(header => 
          header.toLowerCase().replace(/\s+/g, '') === 'materialtype'
        );
        setMaterialTypeColumn(materialTypeCol || '');

        const extractedUnits = {};
        const simplifiedHeadersMap = {};
        headers.forEach(header => {
          console.log('Processing header:', header); // Debugging
          const match = header.match(/(.+)\s*\((.*?)\)/);
          if (match) {
            const propertyName = match[1].trim();
            extractedUnits[header] = match[2];
            simplifiedHeadersMap[header] = propertyName;
            console.log(`Extracted unit for ${propertyName}: ${match[2]}`); // Debugging
          } else {
            simplifiedHeadersMap[header] = header;
            console.log(`No unit found for header: ${header}`); // Debugging
          }
        });
        setUnits(extractedUnits);
        setSimplifiedHeaders(simplifiedHeadersMap);
        console.log('Extracted units:', extractedUnits); // Debugging
        console.log('Simplified headers:', simplifiedHeadersMap); // Debugging
      },
      header: true,
      download: true,
      error: (error) => {
        console.error('Error parsing CSV:', error);
      }
    });
  }, []);

  const materialTypes = useMemo(() => {
    if (!materialTypeColumn) return {};
    const types = [...new Set(csvData.map(row => row[materialTypeColumn]))];
    console.log('Unique material types:', types); // Debugging
    return types.reduce((acc, type, index) => {
      if (type) {
        acc[type] = `hsl(${index * 360 / types.length}, 70%, 50%)`;
      }
      return acc;
    }, {});
  }, [csvData, materialTypeColumn]);

  const handleMaterialSelection = (selectedOptions) => {
    setSelectedMaterials(selectedOptions.map(option => option.value));
  };

  const handleAxisSelection = (setter) => (event) => {
    setter(event.target.value);
  };

  const getChartData = () => {
    const filteredData = csvData.filter(row => selectedMaterials.includes(row.name));
    return {
      datasets: filteredData.map(row => {
        const materialType = row[materialTypeColumn];
        const color = materialTypes[materialType] || 'rgba(128, 128, 128, 0.6)';
        const x = parseFloat(row[xAxis]);
        const y = parseFloat(row[yAxis]);
        return {
          label: row.name,
          data: [{x, y}],
          backgroundColor: color,
          borderColor: color,
          pointRadius: 6,
          pointHoverRadius: 8,
        };
      }),
    };
  };

  const getActiveMaterialTypes = () => {
    const filteredData = csvData.filter(row => selectedMaterials.includes(row.name));
    const activeTypes = new Set(filteredData.map(row => row[materialTypeColumn]));
    return Object.fromEntries(
      Object.entries(materialTypes).filter(([type]) => activeTypes.has(type))
    );
  };

  const formatNumber = (value) => {
    if (Math.abs(value) < 0.01 || Math.abs(value) >= 1000000) {
      return value.toExponential(2);
    }
    return value.toFixed(0);
  };

  const chartOptions = {
    scales: {
      x: { 
        title: { display: true, text: `${simplifiedHeaders[xAxis] || xAxis}${units[xAxis] ? ` (${units[xAxis]})` : ''}` },
        type: 'linear',
        position: 'bottom',
        ticks: {
          callback: function(value, index, values) {
            return formatNumber(value);
          }
        }
      },
      y: { 
        title: { display: true, text: `${simplifiedHeaders[yAxis] || yAxis}${units[yAxis] ? ` (${units[yAxis]})` : ''}` },
        type: 'linear',
        position: 'left',
        ticks: {
          callback: function(value, index, values) {
            return formatNumber(value);
          }
        }
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          title: (context) => context[0].dataset.label,
          label: (context) => {
            const xLabel = `${simplifiedHeaders[xAxis] || xAxis}: ${formatNumber(context.parsed.x)}${units[xAxis] ? ` ${units[xAxis]}` : ''}`;
            const yLabel = `${simplifiedHeaders[yAxis] || yAxis}: ${formatNumber(context.parsed.y)}${units[yAxis] ? ` ${units[yAxis]}` : ''}`;
            return [xLabel, yLabel];
          },
        },
      },
      legend: { display: false },
    },
  };

  const axisOptions = Object.keys(csvData[0] || {}).filter(key => !['name', materialTypeColumn].includes(key));

  const materialOptions = csvData.map(row => ({ value: row.name, label: row.name }));

  const resetSelection = () => {
    setSelectedMaterials([]);
    setXAxis('');
    setYAxis('');
  };

  return (
    <div className="material-selection" style={{ textAlign: 'center', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Material Selection Tool</h2>
      <p>Visualize material properties using this chart.</p>

      {/* Select materials to display */}
      <div style={{ width: '300px', margin: '20px auto' }}>
        <Select
          isMulti
          name="materials"
          options={materialOptions}
          className="basic-multi-select"
          classNamePrefix="select"
          onChange={handleMaterialSelection}
          styles={{ container: (provided) => ({ ...provided, width: '100%' }) }}
        />
      </div>

      {/* Axis selection and reset button */}
      <div style={{ margin: '20px 0' }}>
        <select onChange={handleAxisSelection(setXAxis)} value={xAxis}>
          <option value="">Select X-axis</option>
          {axisOptions.map((column, index) => (
            <option key={index} value={column}>{simplifiedHeaders[column] || column}</option>
          ))}
        </select>
        <select onChange={handleAxisSelection(setYAxis)} value={yAxis} style={{ margin: '0 10px' }}>
          <option value="">Select Y-axis</option>
          {axisOptions.map((column, index) => (
            <option key={index} value={column}>{simplifiedHeaders[column] || column}</option>
          ))}
        </select>
        <button onClick={resetSelection}>Reset</button>
      </div>

      {/* Chart and Legend Container */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        {/* Plot */}
        <div className="plot-container" style={{width: '800px', height: '600px'}}>
          {selectedMaterials.length > 0 && xAxis && yAxis ? (
            <Scatter data={getChartData()} options={chartOptions} />
          ) : (
            <p>Please select materials, X-axis, and Y-axis to display the plot.</p>
          )}
        </div>

        {/* Material Type Legend */}
        <div className="material-type-legend" style={{ marginLeft: '20px', textAlign: 'left' }}>
          <h4>Material Types</h4>
          {Object.entries(getActiveMaterialTypes()).map(([type, color]) => (
            <div key={type} style={{marginBottom: '5px'}}>
              <span style={{
                backgroundColor: color, 
                width: '20px', 
                height: '20px', 
                display: 'inline-block', 
                marginRight: '5px',
                border: '1px solid black',
                verticalAlign: 'middle'
              }}></span>
              <span style={{ verticalAlign: 'middle' }}>{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Debugging Information */}
      <div style={{ marginTop: '20px', textAlign: 'left' }}>
        <h3>Debugging Info:</h3>
        <p>Number of materials: {csvData.length}</p>
        <p>Material type column: {materialTypeColumn}</p>
        <p>Material types: {Object.keys(materialTypes).join(', ')}</p>
        <p>Selected materials: {selectedMaterials.join(', ')}</p>
        <p>Color map: {JSON.stringify(materialTypes, null, 2)}</p>
        <p>Units: {JSON.stringify(units, null, 2)}</p>
        <p>Simplified headers: {JSON.stringify(simplifiedHeaders, null, 2)}</p>
        <p>X-axis: {xAxis}</p>
        <p>Y-axis: {yAxis}</p>
        <p>X-axis unit: {units[xAxis] || 'Not found'}</p>
        <p>Y-axis unit: {units[yAxis] || 'Not found'}</p>
      </div>
    </div>
  );
};

export default MatSel;