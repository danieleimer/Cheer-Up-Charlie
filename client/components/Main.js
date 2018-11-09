import React, {Component} from 'react'
import axios from 'axios'

// MATERIAL UI IMPORTS
import {withStyles} from '@material-ui/core/styles'
import GridList from '@material-ui/core/GridList'
import GridListTile from '@material-ui/core/GridListTile'
import Card from '@material-ui/core/Card'
import CardActionArea from '@material-ui/core/CardActionArea'
import CardContent from '@material-ui/core/CardContent'
import CardActions from '@material-ui/core/CardActions'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import Typography from '@material-ui/core/Typography'

const styles = theme => ({
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  content: {
    width: '80%',
    overflow: 'hidden'
  },
  icon: {
    color: 'rgba(255, 255, 255, 0.54)'
  },
  textField: {
    paddingBottom: theme.spacing.unit * 6,
    width: 200
  },
  menu: {
    width: 200
  },
  top: {
    display: 'flex',
    width: 'auto',
    justifyContent: 'space-between'
  },
  submit: {
    marginTop: theme.spacing.unit,
    marginLeft: theme.spacing.unit * 2,
    marginBottom: theme.spacing.unit * 6,
    alignSelf: 'center'
  },
  card: {
    maxWidth: '30vw',
    boxShadow: 'none',
    border: '1px solid #D8DEE2',
    height: '450'
  },
  media: {
    height: 280
  },
  description: {
    height: 40
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  link: {
    color: 'inherit'
  }
})

class Main extends Component {
  constructor() {
    super()
    this.state = {
      channels: {}
    }
  }

  async componentDidMount() {
    let channels = await axios.get('/channels')
    this.setState({channels: channels.data})
    window.setInterval(async () => {
      channels = await axios.get('/channels')
      this.setState({channels: channels.data})
    }, 5000)
  }

  render() {
    const keys = Object.keys(this.state.channels)
    console.log(keys)
    const {classes} = this.props

    return (
      <GridList
        cellHeight="auto"
        className={classes.gridList}
        cols={3}
        spacing={20}
      >
        {keys.map(key => (
          <GridListTile className={classes.gridListTitle} key={key} cols={1}>
            <Card className={classes.card}>
              <CardActionArea>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="h2">
                    Channel: {key}
                  </Typography>
                  <Typography gutterBottom variant="h5" component="h2">
                    Mood score: {this.state.channels[key]}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </GridListTile>
        ))}
      </GridList>
    )
  }
}

export default withStyles(styles)(Main)
