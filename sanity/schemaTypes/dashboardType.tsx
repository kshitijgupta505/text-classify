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
    // Simple field to display dashboard items
    defineField({
      name: 'dashboardItems',
      title: 'Dashboard Items',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'dashboardItem',
          title: 'Dashboard Item',
          fields: [
            defineField({
              name: 'itemTitle',
              title: 'Item Title',
              type: 'string'
            })
          ],
          // Use the static chart component for preview
          components: {
            preview: ChartBar,
            preview: ChartLine,
            preview: ChartArea,
            preview: ChartPie
          },
          preview: {
            select: {
              title: 'itemTitle'
            }
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
