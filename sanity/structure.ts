// In your deskStructure.js file
import { ChartBar } from "../components/chart-bar"
import { ChartPie } from "../components/chart-pie";
import { ChartLine } from "../components/chart-line";
import { ChartArea } from "../components/chart-area";

export const structure = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Global Dashboard')
        .icon(() => '📊')
        .child(
          S.document()
            .schemaType('dashboard')
            .documentId('globalDashboard')
            .views([
              // S.view.form().title('Content'),
              // Add a custom view to display the static chart
              S.view.component(ChartBar, ChartLine, ChartArea, ChartPie).title('Dashboard Preview')
            ])
        ),
      // Other document types
      ...S.documentTypeListItems().filter(
        listItem => !['dashboard'].includes(listItem.getId())
      )
    ])
