// In your deskStructure.js file
import { ChartBar } from "../components/chart-bar"
import { ChartPie } from "../components/chart-pie"
import { ChartLine } from "../components/chart-line"
import { ChartArea } from "../components/chart-area"

export const structure = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Global Dashboard')
        .icon(() => '📊')
        .child(
          S.list()
            .title('Dashboard Charts')
            .items([
              // S.listItem()
              //   .title('Dashboard Overview')
              //   .child(
              //     S.document()
              //       .schemaType('dashboard')
              //       .documentId('globalDashboard')
              //   ),
              S.listItem()
                .title('Bar Charts')
                .icon(() => '📊')
                .child(
                  S.component(ChartBar)
                    .title('Bar Charts View')
                ),
              S.listItem()
                .title('Line Charts')
                .icon(() => '📈')
                .child(
                  S.component(ChartLine)
                    .title('Line Charts View')
                ),
              S.listItem()
                .title('Area Charts')
                .icon(() => '📉')
                .child(
                  S.component(ChartArea)
                    .title('Area Charts View')
                ),
              S.listItem()
                .title('Pie Charts')
                .icon(() => '🥧')
                .child(
                  S.component(ChartPie)
                    .title('Pie Charts View')
                )
            ])
        ),
      // Other document types
      ...S.documentTypeListItems().filter(
        listItem => !['dashboard'].includes(listItem.getId())
      )
    ])
