function getBoxWidth(labelOpts, fontSize) {
  return labelOpts.usePointStyle ?
    fontSize * Math.SQRT2 :
  labelOpts.boxWidth;
};

Chart.NewLegend = Chart.Legend.extend({
  afterFit: function() {
    this.height = this.height + this.options.paddingBottom;
  },
});

function createNewLegendAndAttach(chartInstance, legendOpts) {
  var legend = new Chart.NewLegend({
    ctx: chartInstance.chart.ctx,
    options: legendOpts,
    chart: chartInstance
  });

  if (chartInstance.legend) {
    Chart.layoutService.removeBox(chartInstance, chartInstance.legend);
    delete chartInstance.newLegend;
  }

  chartInstance.newLegend = legend;
  Chart.layoutService.addBox(chartInstance, legend);
}

// Register the legend plugin
Chart.plugins.register({
  beforeInit: function(chartInstance) {
    var legendOpts = chartInstance.options.legend;

    if (legendOpts) {
      createNewLegendAndAttach(chartInstance, legendOpts);
    }
  },
  beforeUpdate: function(chartInstance) {
    var legendOpts = chartInstance.options.legend;

    if (legendOpts) {
      legendOpts = Chart.helpers.configMerge(Chart.defaults.global.legend, legendOpts);

      if (chartInstance.newLegend) {
        chartInstance.newLegend.options = legendOpts;
      } else {
        createNewLegendAndAttach(chartInstance, legendOpts);
      }
    } else {
      Chart.layoutService.removeBox(chartInstance, chartInstance.newLegend);
      delete chartInstance.newLegend;
    }
  },
  afterEvent: function(chartInstance, e) {
    var legend = chartInstance.newLegend;
    if (legend) {
      legend.handleEvent(e);
    }
  }
});

var helpers = Chart.helpers;
function parseFontOptions(options) {
  var getValueOrDefault = helpers.getValueOrDefault;
  var globalDefaults = Chart.defaults.global;
  var size = getValueOrDefault(options.fontSize, globalDefaults.defaultFontSize);
  var style = getValueOrDefault(options.fontStyle, globalDefaults.defaultFontStyle);
  var family = getValueOrDefault(options.fontFamily, globalDefaults.defaultFontFamily);

  return {
    size: size,
    style: style,
    family: family,
    font: helpers.fontString(size, style, family)
  };
};

var CategoryTopPadding = Chart.scaleService.getScaleConstructor('category').extend({
  draw: function(chartArea) {
    var me = this;
    var options = me.options;
    if (!options.display) {
      return;
    }

    var context = me.ctx;
    var globalDefaults = Chart.defaults.global;
    var optionTicks = options.ticks;
    var gridLines = options.gridLines;
    var scaleLabel = options.scaleLabel;

    var isRotated = me.labelRotation !== 0;
    var skipRatio;
    var useAutoskipper = optionTicks.autoSkip;
    var isHorizontal = me.isHorizontal();

    // figure out the maximum number of gridlines to show
    var maxTicks;
    if (optionTicks.maxTicksLimit) {
      maxTicks = optionTicks.maxTicksLimit;
    }

    var tickFontColor = helpers.getValueOrDefault(optionTicks.fontColor, globalDefaults.defaultFontColor);
    var tickFont = parseFontOptions(optionTicks);

    var tl = gridLines.drawTicks ? gridLines.tickMarkLength : 0;
    var borderDash = helpers.getValueOrDefault(gridLines.borderDash, globalDefaults.borderDash);
    var borderDashOffset = helpers.getValueOrDefault(gridLines.borderDashOffset, globalDefaults.borderDashOffset);

    var scaleLabelFontColor = helpers.getValueOrDefault(scaleLabel.fontColor, globalDefaults.defaultFontColor);
    var scaleLabelFont = parseFontOptions(scaleLabel);

    var labelRotationRadians = helpers.toRadians(me.labelRotation);
    var cosRotation = Math.cos(labelRotationRadians);
    var longestRotatedLabel = me.longestLabelWidth * cosRotation;

    // Make sure we draw text in the correct color and font
    context.fillStyle = tickFontColor;

    var itemsToDraw = [];

    if (isHorizontal) {
      skipRatio = false;

      if ((longestRotatedLabel + optionTicks.autoSkipPadding) * me.ticks.length > (me.width - (me.paddingLeft + me.paddingRight))) {
        skipRatio = 1 + Math.floor(((longestRotatedLabel + optionTicks.autoSkipPadding) * me.ticks.length) / (me.width - (me.paddingLeft + me.paddingRight)));
      }

      // if they defined a max number of optionTicks,
      // increase skipRatio until that number is met
      if (maxTicks && me.ticks.length > maxTicks) {
        while (!skipRatio || me.ticks.length / (skipRatio || 1) > maxTicks) {
          if (!skipRatio) {
            skipRatio = 1;
          }
          skipRatio += 1;
        }
      }

      if (!useAutoskipper) {
        skipRatio = false;
      }
    }


    var xTickStart = options.position === 'right' ? me.left : me.right - tl;
    var xTickEnd = options.position === 'right' ? me.left + tl : me.right;
    var yTickStart = options.position === 'bottom' ? me.top : me.bottom - tl;
    var yTickEnd = options.position === 'bottom' ? me.top + tl : me.bottom;

    helpers.each(me.ticks, function(label, index) {
      // If the callback returned a null or undefined value, do not draw this line
      if (label === undefined || label === null) {
        return;
      }

      var isLastTick = me.ticks.length === index + 1;

      // Since we always show the last tick,we need may need to hide the last shown one before
      var shouldSkip = (skipRatio > 1 && index % skipRatio > 0) || (index % skipRatio === 0 && index + skipRatio >= me.ticks.length);
      if (shouldSkip && !isLastTick || (label === undefined || label === null)) {
        return;
      }

      var lineWidth, lineColor;
      if (index === (typeof me.zeroLineIndex !== 'undefined' ? me.zeroLineIndex : 0)) {
        // Draw the first index specially
        lineWidth = gridLines.zeroLineWidth;
        lineColor = gridLines.zeroLineColor;
      } else {
        lineWidth = helpers.getValueAtIndexOrDefault(gridLines.lineWidth, index);
        lineColor = helpers.getValueAtIndexOrDefault(gridLines.color, index);
      }

      // Common properties
      var tx1, ty1, tx2, ty2, x1, y1, x2, y2, labelX, labelY;
      var textAlign = 'middle';
      var textBaseline = 'middle';

      if (isHorizontal) {

        if (options.position === 'bottom') {
          // bottom
          textBaseline = !isRotated? 'top':'middle';
          textAlign = !isRotated? 'center': 'right';
          labelY = me.top + tl + me.options.paddingTop;
        } else {
          // top
          textBaseline = !isRotated? 'bottom':'middle';
          textAlign = !isRotated? 'center': 'left';
          labelY = me.bottom - tl;
        }

        var xLineValue = me.getPixelForTick(index) + helpers.aliasPixel(lineWidth); // xvalues for grid lines
        labelX = me.getPixelForTick(index, gridLines.offsetGridLines) + optionTicks.labelOffset; // x values for optionTicks (need to consider offsetLabel option)

        tx1 = tx2 = x1 = x2 = xLineValue;
        ty1 = yTickStart;
        ty2 = yTickEnd;
        y1 = chartArea.top;
        y2 = chartArea.bottom;
      } else {
        var isLeft = options.position === 'left';
        var tickPadding = optionTicks.padding;
        var labelXOffset;

        if (optionTicks.mirror) {
          textAlign = isLeft ? 'left' : 'right';
          labelXOffset = tickPadding;
        } else {
          textAlign = isLeft ? 'right' : 'left';
          labelXOffset = tl + tickPadding;
        }

        labelX = isLeft ? me.right - labelXOffset : me.left + labelXOffset;

        var yLineValue = me.getPixelForTick(index); // xvalues for grid lines
        yLineValue += helpers.aliasPixel(lineWidth);
        labelY = me.getPixelForTick(index, gridLines.offsetGridLines);

        tx1 = xTickStart;
        tx2 = xTickEnd;
        x1 = chartArea.left;
        x2 = chartArea.right;
        ty1 = ty2 = y1 = y2 = yLineValue;
      }

      itemsToDraw.push({
        tx1: tx1,
        ty1: ty1,
        tx2: tx2,
        ty2: ty2,
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        labelX: labelX,
        labelY: labelY,
        glWidth: lineWidth,
        glColor: lineColor,
        glBorderDash: borderDash,
        glBorderDashOffset: borderDashOffset,
        rotation: -1 * labelRotationRadians,
        label: label,
        textBaseline: textBaseline,
        textAlign: textAlign
      });
    });

    // Draw all of the tick labels, tick marks, and grid lines at the correct places
    helpers.each(itemsToDraw, function(itemToDraw) {
      if (gridLines.display) {
        context.save();
        context.lineWidth = itemToDraw.glWidth;
        context.strokeStyle = itemToDraw.glColor;
        if (context.setLineDash) {
          context.setLineDash(itemToDraw.glBorderDash);
          context.lineDashOffset = itemToDraw.glBorderDashOffset;
        }

        context.beginPath();

        if (gridLines.drawTicks) {
          context.moveTo(itemToDraw.tx1, itemToDraw.ty1);
          context.lineTo(itemToDraw.tx2, itemToDraw.ty2);
        }

        if (gridLines.drawOnChartArea) {
          context.moveTo(itemToDraw.x1, itemToDraw.y1);
          context.lineTo(itemToDraw.x2, itemToDraw.y2);
        }

        context.stroke();
        context.restore();
      }

      if (optionTicks.display) {
        context.save();
        context.translate(itemToDraw.labelX, itemToDraw.labelY);
        context.rotate(itemToDraw.rotation);
        context.font = tickFont.font;
        context.textBaseline = itemToDraw.textBaseline;
        context.textAlign = itemToDraw.textAlign;

        var label = itemToDraw.label;
        if (helpers.isArray(label)) {
          for (var i = 0, y = 0; i < label.length; ++i) {
            // We just make sure the multiline element is a string here..
            context.fillText('' + label[i], 0, y);
            // apply same lineSpacing as calculated @ L#320
            y += (tickFont.size * 1.5);
          }
        } else {
          context.fillText(label, 0, 0);
        }
        context.restore();
      }
    });

    if (scaleLabel.display) {
      // Draw the scale label
      var scaleLabelX;
      var scaleLabelY;
      var rotation = 0;

      if (isHorizontal) {
        scaleLabelX = me.left + ((me.right - me.left) / 2); // midpoint of the width
        scaleLabelY = options.position === 'bottom' ? me.bottom - (scaleLabelFont.size / 2) : me.top + (scaleLabelFont.size / 2);
      } else {
        var isLeft = options.position === 'left';
        scaleLabelX = isLeft ? me.left + (scaleLabelFont.size / 2) : me.right - (scaleLabelFont.size / 2);
        scaleLabelY = me.top + ((me.bottom - me.top) / 2);
        rotation = isLeft ? -0.5 * Math.PI : 0.5 * Math.PI;
      }

      context.save();
      context.translate(scaleLabelX, scaleLabelY);
      context.rotate(rotation);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = scaleLabelFontColor; // render in correct colour
      context.font = scaleLabelFont.font;
      context.fillText(scaleLabel.labelString, 0, 0);
      context.restore();
    }

    if (gridLines.drawBorder) {
      // Draw the line at the edge of the axis
      context.lineWidth = helpers.getValueAtIndexOrDefault(gridLines.lineWidth, 0);
      context.strokeStyle = helpers.getValueAtIndexOrDefault(gridLines.color, 0);
      var x1 = me.left,
          x2 = me.right,
          y1 = me.top,
          y2 = me.bottom;

      var aliasPixel = helpers.aliasPixel(context.lineWidth);
      if (isHorizontal) {
        y1 = y2 = options.position === 'top' ? me.bottom : me.top;
        y1 += aliasPixel;
        y2 += aliasPixel;
      } else {
        x1 = x2 = options.position === 'left' ? me.right : me.left;
        x1 += aliasPixel;
        x2 += aliasPixel;
      }

      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
    }
  }
});

Chart.scaleService.registerScaleType('categoryTopPadding', CategoryTopPadding, {position: 'bottom'});


var ctx = document.getElementById("mybarChart").getContext("2d");
var mybarChart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Democrat', 'Rebuplican'],
    datasets: [{
      label: '# of Votes',
      backgroundColor: "#000080",
      data: [80, 95],
    }, {
      label: '# of Votes2',
      backgroundColor: "#d3d3d3",
      data: [90, 50],
    }, {
      label: '# of Votes3',
      backgroundColor: "#add8e6",
      data: [45, 65],
    }]
  },
  options: {
    legend: {
      display: true,
      position: 'bottom',
      paddingTop: 50,
      paddingBottom: 25,
      labels: {
        fontColor: "#000080",
      }
    },
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: true,
          padding: 25,
        }
      }],
      xAxes: [{
        type: 'categoryTopPadding',
        gridLines: {
          display : false,
          offsetGridLines: true
        },
        ticks: {
          beginAtZero: true,
        },
        paddingTop: 2,
        paddingBottom: 20,
        scaleLabel: {
          labelString: 'Party',
          display: true,
        }
      }]
    }
  }
});
