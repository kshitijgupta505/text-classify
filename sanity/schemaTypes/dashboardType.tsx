import {defineField, defineType} from 'sanity'
import { ChartBar } from "../../components/chart-bar"
import { ChartLine } from "../../components/chart-line"
import { ChartArea } from "../../components/chart-area"
import { ChartPie } from "../../components/chart-pie"

export const dashboardType = defineType({
  name: 'dashboard',
  title: 'Global Dashboard',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Dashboard Title',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'description',
      title: 'Dashboard Description',
      type: 'text'
    }),
    // Create separate fields for each chart type
    defineField({
      name: 'barCharts',
      title: 'Bar Charts',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'barChart',
          title: 'Bar Chart',
          fields: [
            defineField({
              name: 'title',
              title: 'Chart Title',
              type: 'string'
            }),
            defineField({
              name: 'data',
              title: 'Chart Data',
              type: 'array',
              of: [{type: 'number'}]
            })
          ],
          preview: {
            select: {
              title: 'title'
            },
            component: ChartBar
          }
        }
      ]
    }),
    defineField({
      name: 'lineCharts',
      title: 'Line Charts',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'lineChart',
          title: 'Line Chart',
          fields: [
            defineField({
              name: 'title',
              title: 'Chart Title',
              type: 'string'
            }),
            defineField({
              name: 'data',
              title: 'Chart Data',
              type: 'array',
              of: [{type: 'number'}]
            })
          ],
          preview: {
            select: {
              title: 'title'
            },
            component: ChartLine
          }
        }
      ]
    }),
    defineField({
      name: 'areaCharts',
      title: 'Area Charts',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'areaChart',
          title: 'Area Chart',
          fields: [
            defineField({
              name: 'title',
              title: 'Chart Title',
              type: 'string'
            }),
            defineField({
              name: 'data',
              title: 'Chart Data',
              type: 'array',
              of: [{type: 'number'}]
            })
          ],
          preview: {
            select: {
              title: 'title'
            },
            component: ChartArea
          }
        }
      ]
    }),
    defineField({
      name: 'pieCharts',
      title: 'Pie Charts',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'pieChart',
          title: 'Pie Chart',
          fields: [
            defineField({
              name: 'title',
              title: 'Chart Title',
              type: 'string'
            }),
            defineField({
              name: 'data',
              title: 'Chart Data',
              type: 'array',
              of: [{type: 'number'}]
            })
          ],
          preview: {
            select: {
              title: 'title'
            },
            component: ChartPie
          }
        }
      ]
    })
  ],
  preview: {
    select: {
      title: 'title'
    }
  }
})
